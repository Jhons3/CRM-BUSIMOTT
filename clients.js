// =============================================
// CRM Sales - Clientes (PostgreSQL)
// =============================================
const express = require('express');
const router  = express.Router();
const { query, withTransaction } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { requireRole, onlyAdmin } = require('../middleware/roles');
const requireRoles = (...roles) => requireRole(...roles);

// GET /api/clients  — listar clientes de la empresa
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { classification, status, result, advisorId, q, limit = 50, offset = 0 } = req.query;
    const companyId = req.user.companyId;

    // Asesores solo ven sus propios clientes
    const forAdvisor = req.user.role === 'asesor' ? req.user.id : (advisorId || null);

    let sql = `
      SELECT c.*, u.name AS advisor_name
      FROM clients c
      LEFT JOIN users u ON u.id = c.assigned_advisor_id
      WHERE c.company_id = $1
    `;
    const params = [companyId];
    let i = 2;

    if (classification) { sql += ` AND c.classification = $${i++}`; params.push(classification); }
    if (status)         { sql += ` AND c.status = $${i++}`;         params.push(status); }
    if (result)         { sql += ` AND c.metadata->>'result' = $${i++}`; params.push(result); }
    if (forAdvisor)     { sql += ` AND c.assigned_advisor_id = $${i++}`; params.push(forAdvisor); }
    if (q)              { sql += ` AND (c.name ILIKE $${i} OR c.phone ILIKE $${i++})`; params.push(`%${q}%`); }

    sql += ` ORDER BY c.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await query(sql, params);
    const total = await query(
      `SELECT COUNT(*) FROM clients WHERE company_id = $1`,
      [companyId]
    );

    res.json({ clients: rows, total: parseInt(total.rows[0].count), limit, offset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET /api/clients/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*, u.name AS advisor_name, u.email AS advisor_email
       FROM clients c LEFT JOIN users u ON u.id = c.assigned_advisor_id
       WHERE c.id = $1 AND c.company_id = $2`,
      [req.params.id, req.user.companyId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al obtener cliente' }); }
});

// POST /api/clients  — crear cliente
router.post('/', authMiddleware, requireRoles(['admin', 'supervisor', 'asesor']), async (req, res) => {
  try {
    const { name, phone, email, classification, notes, heat, assignedAdvisorId } = req.body;
    if (!phone) return res.status(400).json({ error: 'El teléfono es obligatorio' });

    const { rows } = await query(
      `INSERT INTO clients (company_id, name, phone, email, classification, notes, assigned_advisor_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        req.user.companyId, name || null, phone,
        email || null, classification || 'needs_info',
        notes || null,
        assignedAdvisorId || (req.user.role === 'asesor' ? req.user.id : null),
        JSON.stringify({ heat: heat || 'tibio', result: null, lossReason: null }),
      ]
    );

    const io = req.app.get('io');
    if (io) io.to(req.user.companyId).emit('client:new', rows[0]);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un cliente con ese teléfono' });
    console.error(err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// PUT /api/clients/:id  — actualizar cliente
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, phone, email, classification, notes, heat, result, lossReason, assignedAdvisorId, status } = req.body;

    const { rows: current } = await query(
      'SELECT * FROM clients WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.companyId]
    );
    if (!current.length) return res.status(404).json({ error: 'Cliente no encontrado' });

    const existing = current[0];
    const metadata = {
      ...existing.metadata,
      ...(heat !== undefined && { heat }),
      ...(result !== undefined && { result }),
      ...(lossReason !== undefined && { lossReason }),
    };

    const { rows } = await query(
      `UPDATE clients SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        email = COALESCE($3, email),
        classification = COALESCE($4, classification),
        notes = COALESCE($5, notes),
        status = COALESCE($6, status),
        assigned_advisor_id = COALESCE($7, assigned_advisor_id),
        metadata = $8,
        last_contact = NOW()
       WHERE id = $9 AND company_id = $10
       RETURNING *`,
      [
        name || null, phone || null, email || null,
        classification || null, notes || null,
        status || null,
        assignedAdvisorId || null,
        JSON.stringify(metadata),
        req.params.id, req.user.companyId,
      ]
    );

    const io = req.app.get('io');
    if (io) io.to(req.user.companyId).emit('client:updated', rows[0]);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// DELETE /api/clients/:id — admin, supervisor y asesor (solo sus propios clientes)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const isAsesor = ['asesor', 'advisor'].includes(req.user.role);
    // El asesor solo puede eliminar clientes asignados a él
    const whereExtra = isAsesor ? 'AND assigned_advisor_id = $3' : '';
    const params     = isAsesor
      ? [req.params.id, req.user.companyId, req.user.id]
      : [req.params.id, req.user.companyId];

    const { rowCount } = await query(
      `DELETE FROM clients WHERE id = $1 AND company_id = $2 ${whereExtra}`,
      params
    );
    if (!rowCount) return res.status(404).json({ error: 'Cliente no encontrado o sin permiso' });
    res.json({ message: 'Cliente eliminado' });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar cliente' }); }
});

// GET /api/clients/stats/summary — estadísticas
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const advisorId = req.user.role === 'asesor' ? req.user.id : null;

    const base = advisorId
      ? 'FROM clients WHERE company_id = $1 AND assigned_advisor_id = $2'
      : 'FROM clients WHERE company_id = $1';
    const params = advisorId ? [companyId, advisorId] : [companyId];

    const { rows } = await query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE classification = 'interested') AS interested,
        COUNT(*) FILTER (WHERE classification = 'needs_info') AS needs_info,
        COUNT(*) FILTER (WHERE classification = 'no_info') AS no_info,
        COUNT(*) FILTER (WHERE metadata->>'result' = 'won') AS won,
        COUNT(*) FILTER (WHERE metadata->>'result' = 'lost') AS lost,
        COUNT(*) FILTER (WHERE metadata->>'result' IS NULL OR metadata->>'result' = 'null') AS in_progress,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS today_new
       ${base}`,
      params
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al obtener estadísticas' }); }
});

module.exports = router;
