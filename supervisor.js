// =============================================
// CRM Sales - Supervisor Routes (PostgreSQL)
// =============================================
const express = require('express');
const router  = express.Router();
const { query } = require('../config/db');
const { notifyAdvisorNewLead } = require('../services/notifyService');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const isSup = [authMiddleware, requireRole('supervisor','admin','super_admin')];
const cid   = req => req.user.companyId;

// GET /api/supervisor/stats
router.get('/stats', ...isSup, async (req, res) => {
  try {
    const [clients, asesores, leads] = await Promise.all([
      query(`SELECT COUNT(*) total,
        COUNT(*) FILTER (WHERE metadata->>'result'='won')  ganados,
        COUNT(*) FILTER (WHERE metadata->>'result'='lost') perdidos,
        COUNT(*) FILTER (WHERE metadata->>'result' IS NULL OR metadata->>'result'='null') en_proceso,
        COUNT(*) FILTER (WHERE DATE(created_at)=CURRENT_DATE) hoy
        FROM clients WHERE company_id=$1`, [cid(req)]),
      query(`SELECT id,name,email,phone,status,last_login,
        (SELECT COUNT(*) FROM clients WHERE assigned_advisor_id=u.id) AS total_clients,
        (SELECT COUNT(*) FROM clients WHERE assigned_advisor_id=u.id AND metadata->>'result'='won') AS ganados,
        (SELECT COUNT(*) FROM clients WHERE assigned_advisor_id=u.id AND metadata->>'result'='lost') AS perdidos
        FROM users u WHERE company_id=$1 AND role IN ('advisor','asesor') ORDER BY name`, [cid(req)]),
      query(`SELECT COUNT(*) total, COUNT(*) FILTER (WHERE nivel='caliente') calientes
        FROM leads WHERE company_id=$1`, [cid(req)]).catch(()=>({rows:[{total:0,calientes:0}]})),
    ]);
    res.json({ clients:clients.rows[0], asesores:asesores.rows, leads:leads.rows[0] });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error stats' }); }
});

// GET /api/supervisor/mis-clientes — clientes asignados al supervisor
router.get('/mis-clientes', ...isSup, async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await query(`
      SELECT c.*,
             u.name AS advisor_name,
             COALESCE(c.metadata->>'result','') AS result,
             COALESCE(c.metadata->>'heat','frio') AS classification
      FROM clients c
      LEFT JOIN users u ON u.id = c.assigned_advisor_id
      WHERE c.company_id=$1 AND c.assigned_advisor_id=$2
      ORDER BY c.created_at DESC
    `, [cid(req), uid]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error mis clientes' }); }
});

// GET /api/supervisor/mis-leads — leads asignados al supervisor
router.get('/mis-leads', ...isSup, async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await query(`
      SELECT l.*, u.name AS asesor_nombre
      FROM leads l
      LEFT JOIN users u ON u.id = l.advisor_id
      WHERE l.company_id=$1 AND l.advisor_id=$2
      ORDER BY l.created_at DESC
    `, [cid(req), uid]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error mis leads' }); }
});

// GET /api/supervisor/clients
router.get('/clients', ...isSup, async (req, res) => {
  try {
    const { advisorId, result, q, limit=100, offset=0 } = req.query;
    let sql = `SELECT c.*,u.name AS advisor_name FROM clients c
               LEFT JOIN users u ON u.id=c.assigned_advisor_id
               WHERE c.company_id=$1`;
    const params = [cid(req)];
    let i=2;
    if (advisorId) { sql+=` AND c.assigned_advisor_id=$${i++}`; params.push(advisorId); }
    if (result)    { sql+=` AND c.metadata->>'result'=$${i++}`; params.push(result); }
    if (q)         { sql+=` AND (c.name ILIKE $${i} OR c.phone ILIKE $${i++})`; params.push(`%${q}%`); }
    sql+=` ORDER BY c.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit),parseInt(offset));
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error clientes' }); }
});

// GET /api/supervisor/asesores
router.get('/asesores', ...isSup, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT u.id,u.name,u.email,u.phone,u.status,u.last_login,
        COUNT(DISTINCT c.id) AS total_clients,
        COUNT(DISTINCT c.id) FILTER (WHERE c.metadata->>'result'='won')  AS ganados,
        COUNT(DISTINCT c.id) FILTER (WHERE c.metadata->>'result'='lost') AS perdidos,
        COUNT(DISTINCT c.id) FILTER (WHERE c.metadata->>'result' IS NULL) AS en_proceso
      FROM users u
      LEFT JOIN clients c ON c.assigned_advisor_id=u.id
      WHERE u.company_id=$1 AND u.role IN ('advisor','asesor')
      GROUP BY u.id ORDER BY u.name
    `, [cid(req)]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error asesores' }); }
});

// GET /api/supervisor/leads
router.get('/leads', ...isSup, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT l.*,u.name AS advisor_name FROM leads l
      LEFT JOIN users u ON u.id=l.advisor_id
      WHERE l.company_id=$1 ORDER BY l.created_at DESC LIMIT 100
    `, [cid(req)]).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error leads' }); }
});

// DELETE /api/supervisor/leads/:id — elimina lead + conversaciones del bot
router.delete('/leads/:id', ...isSup, async (req, res) => {
  try {
    await query(`DELETE FROM bot_conversations WHERE lead_id=$1 AND company_id=$2`, [req.params.id, cid(req)]);
    const { rows } = await query(`DELETE FROM leads WHERE id=$1 AND company_id=$2 RETURNING id`, [req.params.id, cid(req)]);
    if (!rows.length) return res.status(404).json({ error:'Lead no encontrado' });
    res.json({ ok:true });
  } catch(err) { res.status(500).json({ error:'Error eliminando lead' }); }
});

// PUT /api/supervisor/leads/:id — reasignar asesor
router.put('/leads/:id', ...isSup, async (req, res) => {
  try {
    const { advisor_id, nivel } = req.body;
    const { rows: before } = await query(`SELECT advisor_id FROM leads WHERE id=$1 AND company_id=$2`, [req.params.id, cid(req)]);
    const { rows } = await query(`
      UPDATE leads SET
        advisor_id = COALESCE($1, advisor_id),
        nivel      = COALESCE($2, nivel)
      WHERE id=$3 AND company_id=$4 RETURNING *
    `, [advisor_id||null, nivel||null, req.params.id, cid(req)]).catch(()=>({rows:[]}));
    if (!rows.length) return res.status(404).json({ error:'Lead no encontrado' });
    // Notificar al asesor si se le asignó (o reasignó) el lead
    const advisorCambio = advisor_id && advisor_id !== (before[0]?.advisor_id);
    if (advisorCambio) {
      notifyAdvisorNewLead(rows[0], rows[0].telefono, rows[0].nombre, cid(req))
        .catch(e => console.error('[notify] supervisor assign:', e.message));
    }
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error actualizar lead' }); }
});

// GET /api/supervisor/calendar
router.get('/calendar', ...isSup, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM calendar_events
      WHERE company_id=$1 ORDER BY event_date, event_time
    `, [cid(req)]).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error calendario' }); }
});

// GET /api/supervisor/messages
router.get('/messages', ...isSup, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM internal_messages
      WHERE company_id=$1 AND (from_id=$2 OR to_id=$2 OR to_role='supervisor')
      ORDER BY created_at ASC LIMIT 200
    `, [cid(req), req.user.id]).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error mensajes' }); }
});

// POST /api/supervisor/messages
router.post('/messages', ...isSup, async (req, res) => {
  try {
    const { toId, texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ error:'El mensaje no puede estar vacío' });
    const { rows } = await query(`
      INSERT INTO internal_messages (company_id,from_id,from_name,from_role,to_id,texto)
      VALUES ($1,$2,$3,'supervisor',$4,$5) RETURNING *
    `, [cid(req), req.user.id, req.user.name, toId||null, texto.trim()]);
    const io = req.app.get('io');
    if (io) io.to(cid(req)).emit('message:internal', rows[0]);
    res.status(201).json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error al enviar mensaje' }); }
});

// GET /api/supervisor/contacts — admin + asesores para mensajes
router.get('/contacts', ...isSup, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, name, email, role, status
      FROM users
      WHERE company_id=$1 AND role IN ('admin','advisor','asesor')
      ORDER BY role DESC, name ASC
    `, [cid(req)]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error contactos' }); }
});

// GET /api/supervisor/loss-reasons — razones de pérdida para estadísticas
router.get('/loss-reasons', ...isSup, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        c.name,
        c.metadata->>'lossReason' AS loss_reason,
        u.name AS advisor_name,
        c.updated_at
      FROM clients c
      LEFT JOIN users u ON u.id = c.assigned_advisor_id
      WHERE c.company_id=$1
        AND c.metadata->>'result' = 'lost'
        AND c.metadata->>'lossReason' IS NOT NULL
        AND c.metadata->>'lossReason' != ''
      ORDER BY c.updated_at DESC
      LIMIT 50
    `, [cid(req)]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error razones de pérdida' }); }
});

// GET /api/supervisor/sales-stats — estadísticas de ventas con montos
router.get('/sales-stats', ...isSup, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        u.name AS advisor_name,
        COUNT(c.id) FILTER (WHERE c.metadata->>'result'='won') AS ventas,
        COALESCE(SUM((c.metadata->>'saleAmount')::numeric) FILTER (WHERE c.metadata->>'result'='won'), 0) AS total_vendido,
        COUNT(c.id) FILTER (WHERE c.metadata->>'result'='lost') AS perdidos,
        COUNT(c.id) AS total_clientes
      FROM users u
      LEFT JOIN clients c ON c.assigned_advisor_id = u.id AND c.company_id = $1
      WHERE u.company_id=$1 AND u.role IN ('advisor','asesor')
      GROUP BY u.id, u.name
      ORDER BY total_vendido DESC
    `, [cid(req)]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error stats ventas' }); }
});

// POST /api/supervisor/mis-clientes — crear cliente asignado al supervisor
router.post('/mis-clientes', ...isSup, async (req, res) => {
  try {
    const { name, phone, email, notes, heat } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Nombre y teléfono requeridos' });
    const { rows } = await query(`
      INSERT INTO clients (company_id, assigned_advisor_id, name, phone, email, notes, metadata, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW(),NOW()) RETURNING *`,
      [cid(req), req.user.id, name, phone, email||null, notes||null,
       JSON.stringify({ heat: heat||'tibio', result: null })]
    );
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al crear cliente' }); }
});

// PUT /api/supervisor/mis-clientes/:id — editar cliente
router.put('/mis-clientes/:id', ...isSup, async (req, res) => {
  try {
    const { name, phone, email, notes, lossReason, producto, result, heat } = req.body;
    const { rows } = await query(`
      UPDATE clients SET
        name       = COALESCE($1, name),
        phone      = COALESCE($2, phone),
        email      = COALESCE($3, email),
        notes      = COALESCE($4, notes),
        metadata   = metadata || $5::jsonb,
        updated_at = NOW()
      WHERE id=$6 AND company_id=$7 RETURNING *`,
      [name||null, phone||null, email||null, notes||null,
       JSON.stringify({ ...(lossReason!==undefined&&{lossReason}), ...(producto!==undefined&&{producto}), ...(result!==undefined&&{result}), ...(heat!==undefined&&{heat}) }),
       req.params.id, cid(req)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al actualizar cliente' }); }
});

// DELETE /api/supervisor/mis-clientes/:id
router.delete('/mis-clientes/:id', ...isSup, async (req, res) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM clients WHERE id=$1 AND company_id=$2',
      [req.params.id, cid(req)]
    );
    if (!rowCount) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado' });
  } catch(err) { res.status(500).json({ error: 'Error al eliminar cliente' }); }
});

// GET /api/supervisor/team-activities — actividades de todo el equipo
router.get('/team-activities', ...isSup, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT a.*, u.name AS advisor_name, c.name AS client_name
      FROM activities a
      LEFT JOIN users u ON u.id = a.advisor_id
      LEFT JOIN clients c ON c.id = a.client_id
      WHERE a.company_id = $1
      ORDER BY a.created_at DESC
      LIMIT 200
    `, [cid(req)]).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Error actividades equipo' }); }
});

// GET /api/supervisor/my-activities — actividades personales del supervisor
router.get('/my-activities', ...isSup, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT a.*, c.name AS client_name
      FROM activities a
      LEFT JOIN clients c ON c.id = a.client_id
      WHERE a.company_id=$1 AND a.advisor_id=$2
      ORDER BY a.created_at DESC LIMIT 100
    `, [cid(req), req.user.id]).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Error mis actividades' }); }
});

// POST /api/supervisor/my-activities — registrar actividad personal
router.post('/my-activities', ...isSup, async (req, res) => {
  try {
    const { clientId, type, resultado, notas, duration } = req.body;
    const { rows } = await query(`
      INSERT INTO activities (company_id,advisor_id,client_id,type,resultado,notas,duration)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [cid(req), req.user.id, clientId||null, type||'llamada', resultado||null, notas||null, duration||0]
    );
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al registrar actividad' }); }
});

// GET /api/supervisor/notifications — notificaciones del supervisor (últimas 30)
router.get('/notifications', ...isSup, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, type, title, body, data, read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 30
    `, [req.user.id]);
    res.json(rows);
  } catch(err) { res.json([]); }
});

// PATCH /api/supervisor/notifications/:id/read — marcar como leída
router.patch('/notifications/:id/read', ...isSup, async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error' }); }
});

// PATCH /api/supervisor/notifications/read-all — marcar todas como leídas
router.patch('/notifications/read-all', ...isSup, async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
