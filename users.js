// =============================================
// CRM Sales - Usuarios (PostgreSQL)
// =============================================
const express = require('express');
const bcrypt  = require('bcrypt');
const router  = express.Router();
const { query } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { requireRole, onlyAdmin, onlySuperAdmin } = require('../middleware/roles');
const requireRoles = (...roles) => requireRole(...roles);

// GET /api/users  — listar usuarios de la empresa
router.get('/', authMiddleware, requireRoles(['admin', 'supervisor', 'super_admin']), async (req, res) => {
  try {
    const { role, status } = req.query;
    let sql = `SELECT id, name, email, role, phone, status, is_available, created_at, last_login
               FROM users WHERE company_id = $1`;
    const params = [req.user.companyId];
    let i = 2;
    if (role)   { sql += ` AND role = $${i++}`;   params.push(role); }
    if (status) { sql += ` AND status = $${i++}`; params.push(status); }
    sql += ' ORDER BY role, name';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener usuarios' }); }
});

// POST /api/users  — crear usuario (admin)
router.post('/', authMiddleware, requireRoles(['admin', 'super_admin']), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (company_id, name, email, password_hash, role, phone)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, email, role, phone, status, created_at`,
      [req.user.companyId, name, email.toLowerCase(), hash, role || 'advisor', phone || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/users/:id
router.put('/:id', authMiddleware, requireRoles(['admin', 'super_admin']), async (req, res) => {
  try {
    const { name, email, role, phone, status, password } = req.body;
    let sql = `UPDATE users SET
      name   = COALESCE($1, name),
      email  = COALESCE($2, email),
      role   = COALESCE($3, role),
      phone  = COALESCE($4, phone),
      status = COALESCE($5, status)`;
    const params = [name||null, email||null, role||null, phone||null, status||null];

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      sql += `, password_hash = $6`;
      params.push(hash);
      sql += ` WHERE id = $7 AND company_id = $8 RETURNING id, name, email, role, phone, status`;
      params.push(req.params.id, req.user.companyId);
    } else {
      sql += ` WHERE id = $6 AND company_id = $7 RETURNING id, name, email, role, phone, status`;
      params.push(req.params.id, req.user.companyId);
    }

    const { rows } = await query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al actualizar usuario' }); }
});

// DELETE /api/users/:id
router.delete('/:id', authMiddleware, requireRoles(['admin', 'super_admin']), async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    const { rowCount } = await query(
      'DELETE FROM users WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.companyId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado' });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar usuario' }); }
});

module.exports = router;

// ── POST /api/users (con validación de plan) ─────────────────────────────────
// Esta ruta es usada por el ADMIN para crear sus propios usuarios
// Verifica que no exceda los límites del plan
const { query: dbQuery } = require('../config/db');

router.post('/check-limits', authMiddleware, requireRoles(['admin']), async (req, res) => {
  try {
    const { role } = req.body;
    const { rows: comp } = await dbQuery(
      'SELECT plan, max_advisors, max_supervisors FROM companies WHERE id=$1',
      [req.user.companyId]
    );
    if (!comp.length) return res.status(404).json({ error: 'Empresa no encontrada' });

    const { rows: counts } = await dbQuery(`
      SELECT
        COUNT(*) FILTER (WHERE role IN ('advisor','asesor')) advisors,
        COUNT(*) FILTER (WHERE role='supervisor') supervisors
      FROM users WHERE company_id=$1 AND status='active'
    `, [req.user.companyId]);

    const c = comp[0];
    const PLAN_LABELS = { starter:'Starter', growth:'Growth', enterprise:'Enterprise' };

    if ((role==='advisor'||role==='asesor') && parseInt(counts[0].advisors) >= c.max_advisors) {
      return res.status(403).json({
        error: `Tu plan ${PLAN_LABELS[c.plan]||c.plan} permite máximo ${c.max_advisors} asesores. Contacta al administrador del sistema para mejorar tu plan.`,
        limitReached: true,
        current: parseInt(counts[0].advisors),
        max: c.max_advisors,
        plan: c.plan,
      });
    }
    if (role==='supervisor' && parseInt(counts[0].supervisors) >= c.max_supervisors) {
      return res.status(403).json({
        error: `Tu plan ${PLAN_LABELS[c.plan]||c.plan} permite máximo ${c.max_supervisors} supervisor(es). Contacta al administrador del sistema para mejorar tu plan.`,
        limitReached: true,
        current: parseInt(counts[0].supervisors),
        max: c.max_supervisors,
        plan: c.plan,
      });
    }
    res.json({ allowed: true, plan: c.plan, max_advisors: c.max_advisors, max_supervisors: c.max_supervisors });
  } catch(err) { res.status(500).json({ error: 'Error verificando límites' }); }
});
