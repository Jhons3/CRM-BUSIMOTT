// =============================================
// CRM Sales - Admin Routes (PostgreSQL)
// =============================================
const express = require('express');
const bcrypt  = require('bcrypt');
const router  = express.Router();
const { query } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { onlyAdmin, requireRole } = require('../middleware/roles');

const isAdmin = [authMiddleware, onlyAdmin];
const cid = req => req.user.companyId;

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', ...isAdmin, async (req, res) => {
  try {
    const companyId = cid(req);
    const [users, clients, leads, plan] = await Promise.all([
      query(`SELECT
        COUNT(*) total,
        COUNT(*) FILTER (WHERE role IN ('advisor','asesor')) asesores,
        COUNT(*) FILTER (WHERE role='supervisor') supervisores,
        COUNT(*) FILTER (WHERE status='active') activos
        FROM users WHERE company_id=$1 AND role NOT IN ('super_admin','admin')`, [companyId]),
      query(`SELECT
        COUNT(*) total,
        COUNT(*) FILTER (WHERE metadata->>'result'='won')  ganados,
        COUNT(*) FILTER (WHERE metadata->>'result'='lost') perdidos,
        COUNT(*) FILTER (WHERE metadata->>'result' IS NULL OR metadata->>'result'='null') en_proceso,
        COUNT(*) FILTER (WHERE DATE(created_at)=CURRENT_DATE) hoy
        FROM clients WHERE company_id=$1`, [companyId]),
      query(`SELECT COUNT(*) total,
        COUNT(*) FILTER (WHERE nivel='caliente') calientes
        FROM leads WHERE company_id=$1`, [companyId]).catch(()=>({rows:[{total:0,calientes:0}]})),
      query(`SELECT plan, max_advisors, max_supervisors FROM companies WHERE id=$1`, [companyId]),
    ]);
    res.json({
      users:   users.rows[0],
      clients: clients.rows[0],
      leads:   leads.rows[0],
      plan:    plan.rows[0],
    });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error stats' }); }
});

// ── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', ...isAdmin, async (req, res) => {
  try {
    const { role, status } = req.query;
    let sql = `SELECT id,name,email,role,phone,status,created_at,last_login
               FROM users WHERE company_id=$1 AND role NOT IN ('super_admin','admin')`;
    const params = [cid(req)];
    let i = 2;
    if (role)   { sql += ` AND role=$${i++}`;   params.push(role); }
    if (status) { sql += ` AND status=$${i++}`; params.push(status); }
    sql += ' ORDER BY role,name';
    const { rows } = await query(sql, params);

    // Límites del plan
    const { rows:comp } = await query(
      'SELECT plan,max_advisors,max_supervisors FROM companies WHERE id=$1', [cid(req)]
    );
    const counts = {
      asesores:    rows.filter(u=>u.role==='advisor'||u.role==='asesor').length,
      supervisores:rows.filter(u=>u.role==='supervisor').length,
    };
    res.json({ users:rows, plan:comp[0]||{}, counts });
  } catch(err) { res.status(500).json({ error:'Error usuarios' }); }
});

// ── POST /api/admin/users — solo SuperAdmin puede crear usuarios
router.post('/users', ...isAdmin, (req, res) => {
  res.status(403).json({
    error: 'Solo el Super Administrador del sistema puede crear usuarios. Contacta al administrador para solicitar la creación.',
    code: 'ONLY_SUPERADMIN',
  });
});

// ── PUT /api/admin/users/:id ─────────────────────────────────────────────────
router.put('/users/:id', ...isAdmin, async (req, res) => {
  try {
    const { name, email, phone, role, status, password } = req.body;
    let sql = `UPDATE users SET
      name   = COALESCE($1,name),
      email  = COALESCE($2,email),
      phone  = COALESCE($3,phone),
      role   = COALESCE($4,role),
      status = COALESCE($5,status)`;
    const params = [name||null,email||null,phone||null,role||null,status||null];
    if (password) {
      const hash = await bcrypt.hash(password,10);
      sql += `, password_hash=$6 WHERE id=$7 AND company_id=$8 RETURNING id,name,email,phone,role,status`;
      params.push(hash, req.params.id, cid(req));
    } else {
      sql += ` WHERE id=$6 AND company_id=$7 RETURNING id,name,email,phone,role,status`;
      params.push(req.params.id, cid(req));
    }
    const { rows } = await query(sql, params);
    if (!rows.length) return res.status(404).json({ error:'Usuario no encontrado' });
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error actualizar usuario' }); }
});

// ── DELETE /api/admin/users/:id ──────────────────────────────────────────────
router.delete('/users/:id', ...isAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error:'No puedes eliminarte a ti mismo' });
    const { rowCount } = await query(
      'DELETE FROM users WHERE id=$1 AND company_id=$2', [req.params.id, cid(req)]
    );
    if (!rowCount) return res.status(404).json({ error:'Usuario no encontrado' });
    res.json({ message:'Usuario eliminado' });
  } catch(err) { res.status(500).json({ error:'Error eliminar usuario' }); }
});

// ── GET /api/admin/clients ───────────────────────────────────────────────────
router.get('/clients', ...isAdmin, async (req, res) => {
  try {
    const { q, advisorId, result, limit=50, offset=0 } = req.query;
    let sql = `SELECT c.*,u.name AS advisor_name FROM clients c
               LEFT JOIN users u ON u.id=c.assigned_advisor_id
               WHERE c.company_id=$1`;
    const params = [cid(req)];
    let i=2;
    if (advisorId) { sql+=` AND c.assigned_advisor_id=$${i++}`; params.push(advisorId); }
    if (result)    { sql+=` AND c.metadata->>'result'=$${i++}`; params.push(result); }
    if (q)         { sql+=` AND (c.name ILIKE $${i} OR c.phone ILIKE $${i++})`; params.push(`%${q}%`); }
    sql+=` ORDER BY c.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit), parseInt(offset));
    const { rows } = await query(sql, params);
    const total = await query('SELECT COUNT(*) FROM clients WHERE company_id=$1',[cid(req)]);
    res.json({ clients:rows, total:parseInt(total.rows[0].count) });
  } catch(err) { res.status(500).json({ error:'Error clientes' }); }
});

// ── GET /api/admin/leads ─────────────────────────────────────────────────────
router.get('/leads', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT l.*,u.name AS advisor_name FROM leads l
      LEFT JOIN users u ON u.id=l.advisor_id
      WHERE l.company_id=$1 ORDER BY l.created_at DESC LIMIT 100
    `, [cid(req)]).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error leads' }); }
});

// ── GET /api/admin/employees ─────────────────────────────────────────────────
router.get('/employees', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM employees WHERE company_id=$1 ORDER BY name`, [cid(req)]
    ).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error empleados' }); }
});

// ── POST /api/admin/employees ────────────────────────────────────────────────
router.post('/employees', ...isAdmin, async (req, res) => {
  try {
    const { name,email,phone,puesto,department,salary,hire_date } = req.body;
    if (!name) return res.status(400).json({ error:'El nombre es obligatorio' });
    const { rows } = await query(`
      INSERT INTO employees (company_id,name,email,phone,puesto,department,salary,hire_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [cid(req),name,email||null,phone||null,puesto||null,department||null,salary||null,hire_date||null]);
    res.status(201).json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error crear empleado' }); }
});

// ── PUT /api/admin/employees/:id ─────────────────────────────────────────────
router.put('/employees/:id', ...isAdmin, async (req, res) => {
  try {
    const { name,email,phone,puesto,department,salary,hire_date,status } = req.body;
    const { rows } = await query(`
      UPDATE employees SET
        name=$1,email=$2,phone=$3,puesto=$4,department=$5,salary=$6,hire_date=$7,status=COALESCE($8,status)
      WHERE id=$9 AND company_id=$10 RETURNING *
    `, [name,email||null,phone||null,puesto||null,department||null,salary||null,hire_date||null,status||null,req.params.id,cid(req)]);
    if (!rows.length) return res.status(404).json({ error:'Empleado no encontrado' });
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error actualizar empleado' }); }
});

// ── DELETE /api/admin/employees/:id ──────────────────────────────────────────
router.delete('/employees/:id', ...isAdmin, async (req, res) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM employees WHERE id=$1 AND company_id=$2', [req.params.id,cid(req)]
    );
    if (!rowCount) return res.status(404).json({ error:'Empleado no encontrado' });
    res.json({ message:'Empleado eliminado' });
  } catch(err) { res.status(500).json({ error:'Error eliminar empleado' }); }
});

// ── GET /api/admin/messages ──────────────────────────────────────────────────
router.get('/messages', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM internal_messages WHERE company_id=$1
      ORDER BY created_at ASC LIMIT 200
    `, [cid(req)]).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error mensajes' }); }
});

// ── POST /api/admin/messages ─────────────────────────────────────────────────
router.post('/messages', ...isAdmin, async (req, res) => {
  try {
    const { toId, toRole, texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ error:'El mensaje no puede estar vacío' });
    const { rows } = await query(`
      INSERT INTO internal_messages (company_id,from_id,from_name,from_role,to_id,to_role,texto)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [cid(req),req.user.id,req.user.name,req.user.role,toId||null,toRole||null,texto.trim()]);
    const io = req.app.get('io');
    if (io) io.to(cid(req)).emit('message:internal', rows[0]);
    res.status(201).json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error enviar mensaje' }); }
});

module.exports = router;
