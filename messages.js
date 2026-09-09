// =============================================
// CRM Sales - Mensajes Internos (PostgreSQL)
// =============================================
const express = require('express');
const router  = express.Router();
const { query } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Tabla extra que necesitamos en la BD (ejecutar en pgAdmin si no existe):
// CREATE TABLE IF NOT EXISTS internal_messages (
//   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//   company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
//   from_id UUID NOT NULL REFERENCES users(id),
//   from_name VARCHAR(255),
//   from_role VARCHAR(50),
//   to_id UUID REFERENCES users(id),
//   to_role VARCHAR(50),
//   texto TEXT NOT NULL,
//   leido BOOLEAN DEFAULT FALSE,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );

// GET /api/messages/internal
router.get('/internal', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM internal_messages
       WHERE company_id = $1
         AND (from_id = $2 OR to_id = $2 OR to_role = $3)
       ORDER BY created_at ASC`,
      [req.user.companyId, req.user.id, req.user.role]
    );
    res.json(rows);
  } catch (err) {
    // Si la tabla no existe aún devolvemos array vacío
    res.json([]);
  }
});

// POST /api/messages/internal
router.post('/internal', authMiddleware, async (req, res) => {
  try {
    const { toId, toRole, texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });

    const { rows } = await query(
      `INSERT INTO internal_messages (company_id, from_id, from_name, from_role, to_id, to_role, texto)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.companyId, req.user.id, req.user.name, req.user.role, toId||null, toRole||null, texto.trim()]
    );

    const io = req.app.get('io');
    if (io) io.to(req.user.companyId).emit('message:internal', rows[0]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// PUT /api/messages/internal/read
router.put('/internal/read', authMiddleware, async (req, res) => {
  try {
    await query(
      `UPDATE internal_messages SET leido = TRUE
       WHERE company_id = $1 AND (to_id = $2 OR to_role = $3) AND leido = FALSE`,
      [req.user.companyId, req.user.id, req.user.role]
    );
    res.json({ message: 'Mensajes marcados como leídos' });
  } catch (err) { res.json({ message: 'ok' }); }
});

// ── POST /api/messages/send — Enviar WhatsApp desde el CRM ──────────────────
router.post('/send', authMiddleware, async (req, res) => {
  const { leadId, phone, message, companyId } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'Faltan phone y message' });

  try {
    const axios = require('axios');
    const { pool } = require('../config/db');

    // Obtener credenciales de la empresa
    const cid = companyId || req.user.companyId;
    const { rows: waRows } = await pool.query(
      'SELECT wa_phone_id, wa_token FROM companies WHERE id=$1', [cid]
    );
    const wa = waRows[0];
    if (!wa?.wa_phone_id || !wa?.wa_token)
      return res.status(400).json({ error: 'Empresa sin configuracion de WhatsApp' });

    // Formatear telefono para Meta Cloud API
    // Meta requiere: 593XXXXXXXXX (sin +, sin espacios, con codigo de pais)
    let cleanPhone = String(phone).replace(/\D/g, '');

    if (cleanPhone.startsWith('593') && cleanPhone.length === 12) {
      // Ya correcto: 593988644497
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      // Ecuador local: 0988644497 → 593988644497
      cleanPhone = '593' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 9) {
      // Sin codigo: 988644497 → 593988644497
      cleanPhone = '593' + cleanPhone;
    } else if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
      // USA: ya correcto
    }

    console.log('[messages/send] Telefono original:', phone, '→ formateado:', cleanPhone);

    // Enviar por Meta Cloud API
    await axios.post(
      `https://graph.facebook.com/v19.0/${wa.wa_phone_id}/messages`,
      { messaging_product: 'whatsapp', to: cleanPhone, type: 'text', text: { body: message, preview_url: false } },
      { headers: { Authorization: `Bearer ${wa.wa_token}`, 'Content-Type': 'application/json' }, timeout: 8000 }
    );

    // Guardar en bot_conversations como mensaje del asesor
    if (leadId) {
      await pool.query(
        `INSERT INTO bot_conversations (lead_id, company_id, wa_phone, wa_name, direction, message_text, bot_active, created_at)
         VALUES ($1,$2,$3,$4,'outbound',$5,FALSE,NOW())`,
        [leadId, cid, cleanPhone, req.user.name || 'Asesor', message]
      );

      // Desactivar bot SOLO para este lead específico (WHERE id = leadId, no por advisor_id)
      const updResult = await pool.query(
        `UPDATE leads
         SET advisor_active   = TRUE,
             advisor_last_msg = NOW(),
             handoff          = TRUE,
             handoff_reason   = 'asesor_activo',
             updated_at       = NOW()
         WHERE id = $1
         RETURNING id, nombre`,
        [leadId]
      );
      console.log(`[messages] ${req.user.name} tomó control del lead ${updResult.rows[0]?.nombre || leadId} — bot pausado SOLO para ese lead`);
    }

    // Auto-registrar actividad: mensaje enviado desde el CRM
    if (req.user?.id && leadId) {
      pool.query(
        `INSERT INTO activities (company_id, advisor_id, client_id, type, resultado, notas)
         SELECT $1, $2, c.id, 'mensaje_wa', 'Mensaje enviado desde CRM', $3
         FROM clients c WHERE c.company_id=$1 AND (c.phone=$4 OR c.phone=$5) LIMIT 1`,
        [cid, req.user.id, `💬 "${message.substring(0,120)}${message.length>120?'...':''}"`, cleanPhone, '+'+cleanPhone]
      ).catch(e => console.warn('[activity] No se pudo registrar actividad de mensaje:', e.message));
    }

    // Notificar en tiempo real al CRM
    const io = req.app.get('io');
    if (io && leadId) io.to(String(cid)).emit('lead:asesor_message', {
      leadId, message, sender: req.user.name, timestamp: new Date().toISOString()
    });

    res.json({ ok: true, message: 'Mensaje enviado correctamente' });
  } catch(err) {
    console.error('[messages/send]', err.response?.data?.error || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

module.exports = router;
