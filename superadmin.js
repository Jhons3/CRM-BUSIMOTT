// =============================================
// CRM Sales - Super Admin Routes
// Planes: starter(12 asesores,1 sup) | growth(30,3) | enterprise(ilimitado)
// =============================================
const express = require('express');
const bcrypt  = require('bcrypt');
const router  = express.Router();
const { query, withTransaction } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { logAction }      = require('../services/auditService');
const { requireRole } = require('../middleware/roles');
const { clearCompanyPromptCache } = require('../services/botService');

const isSA = [authMiddleware, requireRole('super_admin')];

const PLAN_LIMITS = {
  starter:    { max_advisors:12,   max_supervisors:1,    label:'Starter',    price:99  },
  growth:     { max_advisors:30,   max_supervisors:3,    label:'Growth',     price:199 },
  enterprise: { max_advisors:9999, max_supervisors:9999, label:'Enterprise', price:399 },
};

// ── GET /api/superadmin/plans  ───────────────────────────────────────────────
router.get('/plans', ...isSA, (req, res) => res.json(PLAN_LIMITS));

// ── GET /api/superadmin/ping (debug - verifica conexión) ─────────────────────
router.get('/ping', ...isSA, async (req, res) => {
  try {
    const { rows } = await query('SELECT COUNT(*)::int AS total FROM companies');
    res.json({ ok: true, companies: rows[0].total, timestamp: new Date().toISOString() });
  } catch(err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/superadmin/stats ────────────────────────────────────────────────
router.get('/stats', ...isSA, async (req, res) => {
  try {
    const safeQ = async (sql, fallback) => {
      try { const r = await query(sql); return r.rows[0] || fallback; }
      catch(e) { console.warn('Stats query failed:', e.message); return fallback; }
    };

    const [co, us, cl, ld, bo] = await Promise.all([
      safeQ(`SELECT COUNT(*)::int total,
               COUNT(*) FILTER (WHERE bot_enabled)       bots_on,
               COUNT(*) FILTER (WHERE status='suspended') suspended,
               COUNT(*) FILTER (WHERE plan='starter')    starter,
               COUNT(*) FILTER (WHERE plan='growth')     growth,
               COUNT(*) FILTER (WHERE plan='enterprise') enterprise
             FROM companies`,
        {total:0,bots_on:0,suspended:0,starter:0,growth:0,enterprise:0}),
      safeQ(`SELECT COUNT(*)::int total,
               COUNT(*) FILTER (WHERE role='admin')      admins,
               COUNT(*) FILTER (WHERE role='supervisor') supervisors,
               COUNT(*) FILTER (WHERE role IN ('advisor','asesor')) advisors,
               COUNT(*) FILTER (WHERE status='active')   active
             FROM users WHERE role != 'super_admin'`,
        {total:0,admins:0,supervisors:0,advisors:0,active:0}),
      safeQ(`SELECT COUNT(*)::int total FROM clients`,
        {total:0,won:0,lost:0,today:0}),
      safeQ(`SELECT COUNT(*)::int total FROM leads`,
        {total:0,hot:0}),
      safeQ(`SELECT
               COUNT(*)::int total,
               COUNT(*) FILTER (WHERE bot_enabled=TRUE)::int active,
               COUNT(*) FILTER (WHERE bot_enabled=FALSE)::int inactive
             FROM bot_config`,
        {total:0,active:0,inactive:0}),
    ]);
    res.json({ companies:co, users:us, clients:cl, leads:ld, bots:bo });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error stats: '+err.message }); }
});

// ── GET /api/superadmin/companies ────────────────────────────────────────────
router.get('/companies', ...isSA, async (req, res) => {
  console.log('[GET /companies] Request from user:', req.user?.email);
  try {
    // Step 1: Get all companies (simplest possible query)
    const { rows } = await query('SELECT * FROM companies ORDER BY created_at DESC');
    console.log('[GET /companies] Found:', rows.length, 'companies');

    // Step 2: Add user counts safely
    try {
      const uRes = await query(`
        SELECT company_id,
          COUNT(*) AS total_users,
          COUNT(*) FILTER (WHERE role='supervisor') AS supervisors,
          COUNT(*) FILTER (WHERE role IN ('advisor','asesor')) AS advisors
        FROM users GROUP BY company_id
      `);
      const uMap = {};
      uRes.rows.forEach(r => { uMap[r.company_id] = r; });
      rows.forEach(r => {
        const u = uMap[r.id] || {};
        r.total_users  = parseInt(u.total_users  || 0);
        r.supervisors  = parseInt(u.supervisors  || 0);
        r.advisors     = parseInt(u.advisors     || 0);
      });
    } catch(e) { console.warn('[GET /companies] users count failed:', e.message); }

    // Step 3: Add client counts safely
    try {
      const cRes = await query('SELECT company_id, COUNT(*) AS total_clients FROM clients GROUP BY company_id');
      const cMap = {};
      cRes.rows.forEach(r => { cMap[r.company_id] = parseInt(r.total_clients); });
      rows.forEach(r => { r.total_clients = cMap[r.id] || 0; });
    } catch(e) { console.warn('[GET /companies] clients count failed:', e.message); }

    // Step 4: Add leads counts safely
    try {
      const lRes = await query('SELECT company_id, COUNT(*) AS total_leads FROM leads GROUP BY company_id');
      const lMap = {};
      lRes.rows.forEach(r => { lMap[r.company_id] = parseInt(r.total_leads); });
      rows.forEach(r => { r.total_leads = lMap[r.id] || 0; });
    } catch(e) {
      rows.forEach(r => { r.total_leads = 0; });
    }

    // Step 5: Add bots count from bot_config
    try {
      const bRes = await query('SELECT company_id, COUNT(*) AS total_bots FROM bot_config WHERE bot_enabled=TRUE GROUP BY company_id');
      const bMap = {};
      bRes.rows.forEach(r => { bMap[r.company_id] = parseInt(r.total_bots); });
      rows.forEach(r => { r.total_bots = bMap[r.id] || 0; });
    } catch(e) {
      rows.forEach(r => { r.total_bots = 0; });
    }

    console.log('[GET /companies] Returning', rows.length, 'companies OK');
    res.json(rows);
  } catch(err) {
    console.error('[GET /companies] FATAL ERROR:', err.message);
    res.status(500).json({ error: 'Error al obtener empresas: ' + err.message });
  }
});

// ── POST /api/superadmin/companies ───────────────────────────────────────────
router.post('/companies', ...isSA, async (req, res) => {
  const { name, plan, city, contact_name, contact_email, contact_phone,
          employee_count, primary_color, secondary_color, sidebar_color, bg_color, card_bg, logo_url, whatsapp_number,
          adminName, adminEmail, adminPassword } = req.body;
  if (!name||!adminName||!adminEmail||!adminPassword)
    return res.status(400).json({ error:'Nombre empresa, admin nombre, email y contraseña requeridos' });
  const lim = PLAN_LIMITS[plan]||PLAN_LIMITS.starter;
  try {
    let company, admin;
    await withTransaction(async (client) => {
      const { rows:comp } = await client.query(`
        INSERT INTO companies (
          name, plan, city, contact_name, contact_email, contact_phone,
          employee_count, primary_color, secondary_color, sidebar_color, bg_color, logo_url,
          whatsapp_number, max_advisors, max_supervisors, settings, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'{}','active')
        RETURNING *
      `, [
        name, plan||'starter', city||null, contact_name||null, contact_email||null,
        contact_phone||null, employee_count||0,
        primary_color||'#4f46e5', secondary_color||'#3b55e0',
        sidebar_color||'#3b55e0', bg_color||'#f8fafc', logo_url||null,
        whatsapp_number||null, lim.max_advisors, lim.max_supervisors
      ]);
      company = comp[0];
      const hash = await bcrypt.hash(adminPassword,10);
      const { rows:usr } = await client.query(`
        INSERT INTO users (company_id,name,email,password_hash,role,status)
        VALUES ($1,$2,$3,$4,'admin','active') RETURNING id,name,email,role,company_id
      `, [company.id,adminName,adminEmail.toLowerCase(),hash]);
      admin = usr[0];
    });
    res.status(201).json({ company, admin, message:`Empresa "${name}" creada con plan ${lim.label}` });
  } catch(err) {
    if (err.code==='23505') return res.status(409).json({ error:'Email del admin ya registrado' });
    console.error(err); res.status(500).json({ error:'Error al crear empresa' });
  }
});

// ── PUT /api/superadmin/companies/:id ────────────────────────────────────────
router.put('/companies/:id', ...isSA, async (req, res) => {
  try {
    const { name, plan, city, contact_name, contact_email, contact_phone,
            employee_count, primary_color, secondary_color, sidebar_color, bg_color, card_bg, logo_url, whatsapp_number,
            bot_enabled, status, suspension_reason, suspended_at, next_payment,
            wa_phone_id, wa_token, product_info,
            bot_hora_inicio, bot_hora_fin, bot_name, bot_welcome_msg, bot_score_threshold,
            gemini_api_key, bot_prompt, bot_filtro_prompt } = req.body;

    // Si cambia el plan, actualizar límites automáticamente
    let maxAdvisors = null, maxSupervisors = null;
    if (plan && PLAN_LIMITS[plan]) {
      maxAdvisors    = PLAN_LIMITS[plan].max_advisors;
      maxSupervisors = PLAN_LIMITS[plan].max_supervisors;
    }

    const { rows } = await query(`
      UPDATE companies SET
        name              = COALESCE($1,  name),
        plan              = COALESCE($2,  plan),
        city              = COALESCE($3,  city),
        contact_name      = COALESCE($4,  contact_name),
        contact_email     = COALESCE($5,  contact_email),
        contact_phone     = COALESCE($6,  contact_phone),
        employee_count    = COALESCE($7,  employee_count),
        primary_color     = COALESCE($8,  primary_color),
        secondary_color   = COALESCE($9,  secondary_color),
        sidebar_color     = COALESCE($10, sidebar_color),
        bg_color          = COALESCE($11, bg_color),
        card_bg           = COALESCE($26, card_bg),
        logo_url          = COALESCE($12, logo_url),
        whatsapp_number   = COALESCE($13, whatsapp_number),
        bot_enabled       = COALESCE($14, bot_enabled),
        status            = COALESCE($15, status),
        suspension_reason = COALESCE($16, suspension_reason),
        suspended_at      = COALESCE($17::TIMESTAMPTZ, suspended_at),
        next_payment      = COALESCE($18::DATE, next_payment),
        max_advisors      = COALESCE($19, max_advisors),
        max_supervisors   = COALESCE($20, max_supervisors),
        wa_phone_id       = COALESCE($21, wa_phone_id),
        wa_token          = COALESCE($22, wa_token),
        product_info      = COALESCE($23, product_info),
        gemini_api_key    = COALESCE($25, gemini_api_key),
        bot_prompt        = COALESCE(NULLIF($27, ''), bot_prompt),
        bot_filtro_prompt = COALESCE(NULLIF($28, ''), bot_filtro_prompt)
      WHERE id=$24 RETURNING *
    `, [
      name||null, plan||null, city||null, contact_name||null, contact_email||null,
      contact_phone||null, employee_count||null, primary_color||null,
      secondary_color||null, sidebar_color||null, bg_color||null, logo_url||null,
      whatsapp_number||null, bot_enabled??null, status||null,
      suspension_reason||null, suspended_at||null, next_payment||null,
      maxAdvisors, maxSupervisors,
      wa_phone_id||null, wa_token||null, product_info||null,
      req.params.id,
      gemini_api_key||null,
      card_bg||null,
      bot_prompt !== undefined ? (bot_prompt||'') : null,
      bot_filtro_prompt !== undefined ? (bot_filtro_prompt||'') : null,
    ]);

    // Actualizar bot_config si se pasaron parámetros del bot
    if (bot_hora_inicio !== undefined || bot_hora_fin !== undefined || bot_name !== undefined || bot_enabled !== undefined) {
      await query(`
        INSERT INTO bot_config (company_id, bot_enabled, hora_inicio, hora_fin, bot_name, welcome_msg, score_threshold, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (company_id) DO UPDATE SET
          bot_enabled     = COALESCE($2, bot_config.bot_enabled),
          hora_inicio     = COALESCE($3, bot_config.hora_inicio),
          hora_fin        = COALESCE($4, bot_config.hora_fin),
          bot_name        = COALESCE($5, bot_config.bot_name),
          welcome_msg     = COALESCE($6, bot_config.welcome_msg),
          score_threshold = COALESCE($7, bot_config.score_threshold),
          updated_at      = NOW()
      `, [
        req.params.id,
        bot_enabled ?? null,
        bot_hora_inicio ?? null,
        bot_hora_fin ?? null,
        bot_name || null,
        bot_welcome_msg || null,
        bot_score_threshold ?? null,
      ]).catch(() => {}); // bot_config puede no existir aún
    }

    if (!rows.length) return res.status(404).json({ error:'Empresa no encontrada' });

    // Limpiar caché de prompts si se actualizó el bot
    if (bot_prompt !== undefined || bot_filtro_prompt !== undefined) {
      clearCompanyPromptCache(req.params.id);
    }

    // Registrar en audit log
    await logAction({
      userId:    req.user?.id,
      companyId: req.params.id,
      action:    'COMPANY_UPDATE',
      entity:    'company',
      entityId:  req.params.id,
      details:   `Empresa actualizada: ${rows[0]?.name}`,
      ip:        req.ip,
    }).catch(()=>{});

    // Si el plan subió/bajó, notificar cuántos usuarios exceden el límite
    const company = rows[0];
    if (plan) {
      const { rows:counts } = await query(`
        SELECT
          COUNT(*) FILTER (WHERE role IN ('advisor','asesor')) advisors,
          COUNT(*) FILTER (WHERE role='supervisor') supervisors
        FROM users WHERE company_id=$1 AND status='active'
      `, [company.id]);
      const over = {
        advisors:    Math.max(0, parseInt(counts[0].advisors)    - company.max_advisors),
        supervisors: Math.max(0, parseInt(counts[0].supervisors) - company.max_supervisors),
      };
      return res.json({ company, planChanged:true, over, limits: PLAN_LIMITS[plan] });
    }

    res.json({ company });
  } catch(err) { console.error(err); res.status(500).json({ error:'Error al actualizar empresa' }); }
});

// ── DELETE /api/superadmin/companies/:id ─────────────────────────────────────
router.delete('/companies/:id', ...isSA, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM companies WHERE id=$1',[req.params.id]);
    if (!rowCount) return res.status(404).json({ error:'No encontrada' });
    res.json({ message:'Empresa y todos sus datos eliminados' });
  } catch(err) { res.status(500).json({ error:'Error al eliminar' }); }
});

// ── GET /api/superadmin/companies/:id/users ──────────────────────────────────
router.get('/companies/:id/users', ...isSA, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, email, role, phone, status, created_at, last_login,
              login_attempts, locked_until, force_password_change
       FROM users WHERE company_id=$1 AND role!='super_admin' ORDER BY role, name`,
      [req.params.id]
    );
    const { rows:comp } = await query('SELECT plan,max_advisors,max_supervisors FROM companies WHERE id=$1',[req.params.id]);
    const limits = comp[0] ? { plan:comp[0].plan, max_advisors:comp[0].max_advisors, max_supervisors:comp[0].max_supervisors } : {};
    res.json({ users:rows, limits });
  } catch(err) { res.status(500).json({ error:'Error usuarios' }); }
});

// ── POST /api/superadmin/companies/:id/users ─────────────────────────────────
// El superadmin puede agregar cualquier rol sin restricción de límites de plan.
router.post('/companies/:id/users', ...isSA, async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name||!email||!password) return res.status(400).json({ error:'Faltan campos' });

    const { rows:comp } = await query('SELECT id FROM companies WHERE id=$1',[req.params.id]);
    if (!comp.length) return res.status(404).json({ error:'Empresa no encontrada' });

    const validRoles = ['admin','supervisor','advisor','asesor'];
    const finalRole  = validRoles.includes(role) ? role : 'advisor';

    const hash = await bcrypt.hash(password,10);
    const { rows } = await query(
      `INSERT INTO users (company_id,name,email,password_hash,role,phone,status)
       VALUES ($1,$2,$3,$4,$5,$6,'active') RETURNING id,name,email,role,phone,created_at`,
      [req.params.id, name, email.toLowerCase(), hash, finalRole, phone||null]
    );
    res.status(201).json(rows[0]);
  } catch(err) {
    if (err.code==='23505') return res.status(409).json({ error:'Email ya registrado' });
    res.status(500).json({ error:'Error crear usuario' });
  }
});

// ── DELETE /api/superadmin/users/:id ─────────────────────────────────────────
router.delete('/users/:id', ...isSA, async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error:'No puedes eliminar tu propia cuenta' });
    const { rowCount } = await query(
      `DELETE FROM users WHERE id=$1 AND role != 'super_admin'`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error:'Usuario no encontrado' });
    res.json({ message:'Usuario eliminado' });
  } catch(err) { res.status(500).json({ error:'Error al eliminar usuario' }); }
});

// ── GET /api/superadmin/bots ─────────────────────────────────────────────────
router.get('/bots', ...isSA, async (req, res) => {
  try {
    // Leer bots desde bot_config (fuente real) + datos de companies
    const { rows } = await query(`
      SELECT
        bc.id,
        bc.company_id,
        bc.bot_enabled,
        bc.bot_name                          AS name,
        bc.hora_inicio,
        bc.hora_fin,
        bc.timezone,
        bc.updated_at                        AS created_at,
        c.name                               AS company_name,
        c.whatsapp_number,
        c.wa_phone_id,
        c.plan,
        c.primary_color,
        c.status                             AS company_status,
        CASE WHEN bc.bot_enabled = TRUE
             THEN 'active' ELSE 'inactive' END AS status,
        (SELECT COUNT(*) FROM bot_conversations bv
          WHERE bv.company_id = bc.company_id) AS total_messages,
        (SELECT COUNT(*) FROM leads l
          WHERE l.company_id = bc.company_id) AS total_leads,
        (SELECT COUNT(*) FROM leads l
          WHERE l.company_id = bc.company_id
            AND l.nivel = 'caliente') AS total_converted,
        bc.updated_at                         AS last_activity
      FROM bot_config bc
      JOIN companies c ON c.id = bc.company_id
      ORDER BY bc.updated_at DESC
    `).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error bots' }); }
});

// ── GET /api/superadmin/bots/:id/activity ────────────────────────────────────
router.get('/bots/:id/activity', ...isSA, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM bot_activity WHERE bot_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [req.params.id]
    ).catch(()=>({rows:[]}));
    res.json(rows);
  } catch(err) { res.status(500).json({ error:'Error actividad' }); }
});

// ── PUT /api/superadmin/bots/:id ─────────────────────────────────────────────
router.put('/bots/:id', ...isSA, async (req, res) => {
  try {
    const { status, name, whatsapp_number } = req.body;
    const { rows } = await query(
      `UPDATE bots SET
        status           = COALESCE($1, status),
        name             = COALESCE($2, name),
        whatsapp_number  = COALESCE($3, whatsapp_number)
       WHERE id=$4 RETURNING *`,
      [status||null, name||null, whatsapp_number||null, req.params.id]
    ).catch(()=>({rows:[]}));
    if (!rows.length) return res.status(404).json({ error:'Bot no encontrado' });
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error actualizar bot' }); }
});

// ── POST /api/superadmin/companies/:id/bots ──────────────────────────────────
router.post('/companies/:id/bots', ...isSA, async (req, res) => {
  try {
    const { name, whatsapp_number } = req.body;
    const { rows } = await query(
      `INSERT INTO bots (company_id,name,whatsapp_number,status)
       VALUES ($1,$2,$3,'inactive') RETURNING *`,
      [req.params.id, name||'Bot WhatsApp', whatsapp_number||null]
    ).catch(e=>{ throw e; });
    res.status(201).json(rows[0]);
  } catch(err) { res.status(500).json({ error:'Error crear bot' }); }
});

// ── GET /api/superadmin/companies/:id/leads ──────────────────────────────────
router.get('/companies/:id/leads', ...isSA, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT l.id, l.nombre, l.telefono, l.nivel, l.score,
             l.origen, l.created_at,
             u.name AS asesor_nombre
      FROM leads l
      LEFT JOIN users u ON u.id = l.advisor_id
      WHERE l.company_id = $1
      ORDER BY l.created_at DESC
      LIMIT 200
    `, [req.params.id]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/superadmin/companies/:id/clients ─────────────────────────────────
router.get('/companies/:id/clients', ...isSA, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT c.id, c.name, c.phone, c.email,
             c.classification, c.created_at,
             u.name AS asesor_nombre
      FROM clients c
      LEFT JOIN users u ON u.id = c.assigned_advisor_id
      WHERE c.company_id = $1
      ORDER BY c.created_at DESC
      LIMIT 200
    `, [req.params.id]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/superadmin/users/:id/reset-password ──────────────────────────────
router.put('/users/:id/reset-password', ...isSA, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(`
      UPDATE users SET
        password_hash         = $1,
        force_password_change = TRUE,
        login_attempts        = 0,
        locked_until          = NULL,
        updated_at            = NOW()
      WHERE id = $2
      RETURNING id, name, email, role
    `, [hash, req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({
      message: `Contraseña restablecida para ${rows[0].name}. El usuario deberá crear una nueva contraseña al ingresar.`,
      user: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
});

// ── GET /api/superadmin/audit-log ────────────────────────────────────────────
router.get('/audit-log', ...isSA, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT al.*, u.name AS user_name, u.email AS user_email
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 200
    `).catch(() => ({ rows: [] }));
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Error audit log' }); }
});

// ── GET /api/superadmin/revenue ───────────────────────────────────────────────
router.get('/revenue', ...isSA, async (req, res) => {
  try {
    const PLAN_PRICES = { starter: 99, growth: 199, enterprise: 399 };
    const { rows: companies } = await query(`
      SELECT id, name, plan, status, created_at, next_payment,
             monthly_fee, payment_status, last_payment,
             (SELECT COUNT(*) FROM users u WHERE u.company_id = companies.id AND u.role != 'super_admin') AS total_users,
             (SELECT COUNT(*) FROM leads l WHERE l.company_id = companies.id) AS total_leads
      FROM companies
      ORDER BY created_at DESC
    `);
    const revenue = companies.map(c => ({
      ...c,
      monthly_revenue: parseFloat(c.monthly_fee) || PLAN_PRICES[c.plan] || 99,
      is_overdue: c.next_payment && new Date(c.next_payment) < new Date(),
    }));
    const active   = revenue.filter(c => c.status === 'active');
    const total    = active.reduce((s, c) => s + c.monthly_revenue, 0);
    res.json({
      companies: revenue,
      total_monthly:  total,
      total_annual:   total * 12,
      active_count:   active.length,
      suspended_count: revenue.filter(c => c.status === 'suspended').length,
    });
  } catch(err) { res.status(500).json({ error: 'Error revenue: ' + err.message }); }
});

// ── POST /api/superadmin/change-password ──────────────────────────────────────
router.post('/change-password', ...isSA, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Faltan campos' });
  if (new_password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  try {
    const { rows } = await query(
      `SELECT password_hash FROM users WHERE id=$1 AND role='super_admin'`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    const hash = await bcrypt.hash(new_password, 10);
    await query(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [hash, req.user.id]);
    res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/superadmin/bot-conversations/:companyId ──────────────────────────
router.get('/bot-conversations/:companyId', ...isSA, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT bc.wa_name, bc.wa_phone, bc.direction, bc.message_text,
             bc.intent, bc.score_delta, bc.created_at,
             l.nombre AS lead_nombre, l.nivel, l.score
      FROM bot_conversations bc
      LEFT JOIN leads l ON l.id = bc.lead_id
      WHERE bc.company_id = $1
      ORDER BY bc.created_at DESC
      LIMIT 100
    `, [req.params.companyId]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
