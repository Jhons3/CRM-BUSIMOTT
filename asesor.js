// =============================================
// CRM Sales - Asesor Routes (PostgreSQL)
// =============================================
const express = require('express');
const router  = express.Router();
const { query } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const isAsesor = [authMiddleware, requireRole('advisor','asesor','supervisor','admin','super_admin')];
const cid = req => req.user.companyId;
const uid = req => req.user.id;

// GET /api/asesor/clients — mis clientes
router.get('/clients', ...isAsesor, async (req, res) => {
  try {
    const { q } = req.query;
    let sql = `SELECT c.*, u.name AS advisor_name FROM clients c
               LEFT JOIN users u ON u.id=c.assigned_advisor_id
               WHERE c.company_id=$1 AND c.assigned_advisor_id=$2`;
    const params = [cid(req), uid(req)];
    if (q) { sql += ` AND (c.name ILIKE $3 OR c.phone ILIKE $3)`; params.push(`%${q}%`); }
    sql += ' ORDER BY c.created_at DESC';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error clientes' }); }
});

// PUT /api/asesor/clients/:id — actualizar cliente
router.put('/clients/:id', ...isAsesor, async (req, res) => {
  try {
    const { name, phone, email, notes, result, lossReason, producto, heat, saleAmount, saleConcept } = req.body;

    // Obtener metadata actual (verificando que pertenece a la empresa del asesor)
    const { rows:current } = await query(
      'SELECT metadata FROM clients WHERE id=$1 AND company_id=$2',
      [req.params.id, cid(req)]
    );
    if (!current.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    const existing = current[0]?.metadata || {};

    const metadata = JSON.stringify({
      ...existing,
      result:      result !== undefined ? result : existing.result,
      lossReason:  lossReason || existing.lossReason || null,
      producto:    producto !== undefined ? (producto || null) : existing.producto,
      heat:        heat || existing.heat || 'tibio',
      saleAmount:  saleAmount || existing.saleAmount || 0,
      saleConcept: saleConcept || existing.saleConcept || '',
    });

    const { rows } = await query(`
      UPDATE clients SET
        name  = COALESCE($1, name),
        phone = COALESCE($2, phone),
        email = COALESCE($3, email),
        notes = COALESCE($4, notes),
        metadata = $5,
        status   = CASE WHEN $6='won' THEN 'closed' WHEN $6='lost' THEN 'lost' ELSE status END,
        last_contact = NOW()
      WHERE id=$7 AND company_id=$8
      RETURNING *
    `, [name||null,phone||null,email||null,notes||null,metadata,
        result||null, req.params.id, cid(req)]);
    if (!rows.length) return res.status(404).json({ error:'Cliente no encontrado' });
    const cliente = rows[0];

    // Auto-registrar actividad cuando cambia estado a ganado o perdido
    if (result && result !== existing.result) {
      const tipo = result === 'won' ? 'cambio_estado' : 'cambio_estado';
      const nota = result === 'won'
        ? `✅ Cliente marcado como GANADO${saleAmount ? ` — Venta: $${saleAmount}${saleConcept ? ` (${saleConcept})` : ''}` : ''}`
        : `❌ Cliente marcado como PERDIDO${lossReason ? ` — Concepto: ${lossReason}` : ''}`;
      query(
        `INSERT INTO activities (company_id,advisor_id,client_id,type,resultado,notas) VALUES ($1,$2,$3,$4,$5,$6)`,
        [cid(req), uid(req), req.params.id, tipo, result === 'won' ? 'Venta cerrada' : 'Pérdida registrada', nota]
      ).catch(() => {});
    }

    // Auto-registrar si cambió temperatura (heat)
    if (heat && heat !== existing.heat) {
      const heatLabels = { caliente:'🔥 Caliente', tibio:'🌡️ Tibio', frio:'❄️ Frío' };
      query(
        `INSERT INTO activities (company_id,advisor_id,client_id,type,resultado,notas) VALUES ($1,$2,$3,$4,$5,$6)`,
        [cid(req), uid(req), req.params.id, 'cambio_estado', `Temperatura → ${heatLabels[heat]||heat}`,
         `Cambió estado de temperatura a ${heatLabels[heat]||heat}`]
      ).catch(() => {});
    }

    res.json(cliente);
  } catch(err) { console.error(err); res.status(500).json({ error:'Error actualizar cliente' }); }
});

// GET /api/asesor/stats
router.get('/stats', ...isAsesor, async (req, res) => {
  try {
    const safeQ = async (sql, params, fallback={}) => {
      try { const r = await query(sql, params); return r.rows[0] || fallback; }
      catch(e) { console.warn('[asesor/stats]', e.message); return fallback; }
    };

    const [clients, actions, events, leads, citasPendientes, mensajes, leadsCalientes] = await Promise.all([
      safeQ(`SELECT
        COUNT(*)::int total,
        COUNT(*) FILTER (WHERE metadata->>'result'='won')::int  ganados,
        COUNT(*) FILTER (WHERE metadata->>'result'='lost')::int perdidos,
        COUNT(*) FILTER (WHERE metadata->>'result' IS NULL OR metadata->>'result'='null')::int en_proceso,
        COUNT(*) FILTER (WHERE DATE(created_at)=CURRENT_DATE)::int hoy
        FROM clients WHERE company_id=$1 AND assigned_advisor_id=$2`,
        [cid(req),uid(req)], {total:0,ganados:0,perdidos:0,en_proceso:0,hoy:0}),

      safeQ(`SELECT
        COUNT(*)::int total,
        COUNT(*) FILTER (WHERE DATE(created_at)=CURRENT_DATE)::int hoy,
        COUNT(*) FILTER (WHERE DATE(created_at)>=DATE_TRUNC('month',CURRENT_DATE))::int este_mes
        FROM activities WHERE company_id=$1 AND advisor_id=$2`,
        [cid(req),uid(req)], {total:0,hoy:0,este_mes:0}),

      safeQ(`SELECT COUNT(*)::int total
        FROM calendar_events
        WHERE company_id=$1 AND advisor_id=$2 AND done=false AND event_date>=CURRENT_DATE`,
        [cid(req),uid(req)], {total:0}),

      safeQ(`SELECT
        COUNT(*)::int total,
        COUNT(*) FILTER (WHERE nivel='caliente')::int calientes,
        COUNT(*) FILTER (WHERE nivel='tibio')::int tibios,
        COUNT(*) FILTER (WHERE nivel='frio')::int frios,
        COUNT(*) FILTER (WHERE DATE(created_at)=CURRENT_DATE)::int hoy,
        COALESCE(AVG(score),0)::int score_promedio
        FROM leads WHERE company_id=$1 AND advisor_id=$2`,
        [cid(req),uid(req)], {total:0,calientes:0,tibios:0,frios:0,hoy:0,score_promedio:0}),

      safeQ(`SELECT COUNT(*)::int total
        FROM calendar_events
        WHERE company_id=$1 AND advisor_id=$2 AND done=false
          AND event_date=CURRENT_DATE`,
        [cid(req),uid(req)], {total:0}),

      safeQ(`SELECT COUNT(*)::int total
        FROM bot_conversations
        WHERE company_id=$1 AND direction='outbound'
          AND DATE(created_at)=CURRENT_DATE`,
        [cid(req)], {total:0}),

      safeQ(`SELECT COUNT(*)::int total
        FROM leads
        WHERE company_id=$1 AND advisor_id=$2 AND nivel='caliente'
          AND updated_at > NOW() - INTERVAL '24 hours'`,
        [cid(req),uid(req)], {total:0}),
    ]);

    // Calcular tasa de conversion
    const total = parseInt(clients.total) || 1;
    const ganados = parseInt(clients.ganados) || 0;
    const tasa_conversion = Math.round((ganados / total) * 100);

    // Meta del mes (puedes configurar esto)
    const meta_mes = 10;
    const avance_meta = Math.min(Math.round((ganados / meta_mes) * 100), 100);

    res.json({
      clients, actions, events, leads,
      citas_hoy:     citasPendientes.total,
      mensajes_hoy:  mensajes.total,
      leads_calientes: leadsCalientes.total,
      tasa_conversion,
      meta_mes,
      avance_meta,
    });
  } catch(err) {
    console.error('[asesor/stats]', err.message);
    res.status(500).json({ error:'Error stats' });
  }
});

// GET /api/asesor/activities
router.get('/activities', ...isAsesor, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT a.*, c.name AS client_name FROM activities a
      LEFT JOIN clients c ON c.id=a.client_id
      WHERE a.company_id=$1 AND a.advisor_id=$2
      ORDER BY a.created_at DESC LIMIT 100
    `, [cid(req),uid(req)]).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error actividades' }); }
});

// POST /api/asesor/activities
router.post('/activities', ...isAsesor, async (req, res) => {
  try {
    const { clientId, type, resultado, notas, duration } = req.body;
    const { rows } = await query(`
      INSERT INTO activities (company_id,advisor_id,client_id,type,resultado,notas,duration)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [cid(req),uid(req),clientId||null,type||'llamada',resultado||null,notas||null,duration||0]);
    res.status(201).json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error crear actividad' }); }
});

// ── SQL para asegurar tabla calendar_events ──────────────────────────────────
// CREATE TABLE IF NOT EXISTS calendar_events (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   company_id UUID, advisor_id UUID, client_id UUID,
//   client_name VARCHAR(100), type VARCHAR(30),
//   event_date DATE, event_time VARCHAR(10),
//   notes TEXT, done BOOLEAN DEFAULT FALSE,
//   reminder_sent BOOLEAN DEFAULT FALSE,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );

// GET /api/asesor/calendar
router.get('/calendar', ...isAsesor, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM calendar_events WHERE company_id=$1 AND advisor_id=$2
      ORDER BY event_date, event_time
    `, [cid(req),uid(req)]).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error calendario' }); }
});

// POST /api/asesor/calendar
router.post('/calendar', ...isAsesor, async (req, res) => {
  try {
    const { clientId, clientName, type, eventDate, eventTime, notes } = req.body;
    const { rows } = await query(`
      INSERT INTO calendar_events (company_id,advisor_id,client_id,client_name,type,event_date,event_time,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [cid(req),uid(req),clientId||null,clientName||null,type||'llamada',eventDate,eventTime||null,notes||null]);
    res.status(201).json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error crear evento' }); }
});

// PUT /api/asesor/calendar/:id
router.put('/calendar/:id', ...isAsesor, async (req, res) => {
  try {
    const { done, notes, eventDate, eventTime } = req.body;
    const { rows } = await query(`
      UPDATE calendar_events SET
        done=$1, notes=COALESCE($2,notes), event_date=COALESCE($3,event_date), event_time=COALESCE($4,event_time)
      WHERE id=$5 AND company_id=$6 AND advisor_id=$7 RETURNING *
    `, [done??false,notes||null,eventDate||null,eventTime||null,req.params.id,cid(req),uid(req)]);
    if (!rows.length) return res.status(404).json({ error:'Evento no encontrado' });
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error actualizar evento' }); }
});

// GET /api/asesor/leads
router.get('/leads', ...isAsesor, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM leads WHERE company_id=$1 AND advisor_id=$2
      ORDER BY created_at DESC LIMIT 100
    `, [cid(req),uid(req)]).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error leads' }); }
});

// DELETE /api/asesor/leads/:id — elimina lead + conversaciones del bot
router.delete('/leads/:id', ...isAsesor, async (req, res) => {
  try {
    await query(`DELETE FROM bot_conversations WHERE lead_id=$1 AND company_id=$2`, [req.params.id, cid(req)]);
    const { rows } = await query(`DELETE FROM leads WHERE id=$1 AND company_id=$2 AND advisor_id=$3 RETURNING id`, [req.params.id, cid(req), uid(req)]);
    if (!rows.length) return res.status(404).json({ error:'Lead no encontrado' });
    res.json({ ok:true });
  } catch(err) { res.status(500).json({ error:'Error eliminando lead' }); }
});

// PUT /api/asesor/leads/:id — actualiza nivel, datos, score
router.put('/leads/:id', ...isAsesor, async (req, res) => {
  try {
    const { nivel, nombre, telefono, email, score, notas, cedula } = req.body;
    const { rows } = await query(`
      UPDATE leads SET
        nivel      = COALESCE($1, nivel),
        nombre     = COALESCE($2, nombre),
        telefono   = COALESCE($3, telefono),
        email      = COALESCE($4, email),
        score      = COALESCE($5, score),
        notas      = COALESCE($6, notas),
        cedula     = COALESCE($7, cedula),
        updated_at = NOW()
      WHERE id=$8 AND company_id=$9 AND advisor_id=$10 RETURNING *
    `, [nivel||null,nombre||null,telefono||null,email||null,score||null,notas||null,cedula||null,req.params.id,cid(req),uid(req)]);
    if (!rows.length) return res.status(404).json({ error:'Lead no encontrado' });
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error actualizando lead' }); }
});

// GET /api/asesor/messages
router.get('/messages', ...isAsesor, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM internal_messages
      WHERE company_id=$1 AND (from_id=$2 OR to_id=$2 OR to_role IN ('advisor','asesor'))
      ORDER BY created_at ASC LIMIT 200
    `, [cid(req),uid(req)]).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error mensajes' }); }
});

// POST /api/asesor/messages
router.post('/messages', ...isAsesor, async (req, res) => {
  try {
    const { toId, texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ error:'Mensaje vacío' });
    const { rows } = await query(`
      INSERT INTO internal_messages (company_id,from_id,from_name,from_role,to_id,texto)
      VALUES ($1,$2,$3,'asesor',$4,$5) RETURNING *
    `, [cid(req),uid(req),req.user.name,toId||null,texto.trim()]);
    const io = req.app.get('io');
    if (io) io.to(cid(req)).emit('message:internal', rows[0]);
    res.status(201).json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error enviar mensaje' }); }
});

// GET /api/asesor/contacts — supervisor + admin para mensajes
router.get('/contacts', ...isAsesor, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id,name,email,role,status FROM users
      WHERE company_id=$1 AND role IN ('admin','supervisor')
      ORDER BY role DESC, name ASC
    `, [cid(req)]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error contactos' }); }
});

// GET /api/asesor/payments
router.get('/payments', ...isAsesor, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT p.*, c.name AS client_name
      FROM payments p
      LEFT JOIN clients c ON c.id = p.client_id
      WHERE p.company_id = $1 AND p.advisor_id = $2
      ORDER BY p.due_date ASC
    `, [cid(req), uid(req)]).catch(async () => {
      // If payments table doesn't exist, return empty
      return { rows: [] };
    });
    res.json(rows);
  } catch(err) { res.json([]); }
});

// GET /api/asesor/notifications — notificaciones del asesor (últimas 30)
router.get('/notifications', ...isAsesor, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, type, title, body, data, read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 30
    `, [uid(req)]);
    res.json(rows);
  } catch(err) { res.json([]); }
});

// PATCH /api/asesor/notifications/:id/read — marcar como leída
router.patch('/notifications/:id/read', ...isAsesor, async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
      [req.params.id, uid(req)]
    );
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error' }); }
});

// PATCH /api/asesor/notifications/read-all — marcar todas como leídas
router.patch('/notifications/read-all', ...isAsesor, async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE`,
      [uid(req)]
    );
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
