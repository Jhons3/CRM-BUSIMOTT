// =============================================
// CRM Sales - Servidor Principal (PostgreSQL)
// =============================================
require('dotenv').config();

// ─── Validación de secrets críticos ──────────────────────────────────────────
// JWT_SECRET se exige SIEMPRE: sin él, los tokens se firmarían/validarían con un
// fallback público y cualquiera podría forjar un JWT de super_admin.
if (!process.env.JWT_SECRET) throw new Error('🔴 FATAL: JWT_SECRET no está en .env — el servidor NO puede arrancar sin él');
if (process.env.NODE_ENV === 'production') {
  if (!process.env.DB_PASSWORD) throw new Error('🔴 FATAL: DB_PASSWORD no está en .env — el servidor NO puede arrancar en producción sin él');
  if (!process.env.ADMIN_SECRET) console.warn('⚠️  ADMIN_SECRET no está en .env — el endpoint /trigger-cron quedará deshabilitado');
}
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const { createServer } = require('http');
const { Server }  = require('socket.io');
const { pool }    = require('./config/db');

const app        = express();
const httpServer = createServer(app);

// ─── Trust proxy (necesario para ngrok y producción) ─────────────────────────
app.set('trust proxy', 1);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET','POST'] },
});
app.set('io', io);

io.on('connection', socket => {
  socket.on('join:company', (companyId) => socket.join(String(companyId)));
  socket.on('disconnect', () => {});
});

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(helmet({
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY — evita que el sitio se cargue en un <iframe> ajeno (clonación/phishing)
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'frame-ancestors': ["'none'"], // refuerzo moderno de frameguard, soportado por todos los navegadores actuales
    },
  },
}));
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(rateLimit({ windowMs: 15*60*1000, max: 500 }));

// Rate limit específico para rutas de autenticación (10 intentos por IP cada 15 min)
// Protege contra brute force por IP, complementando el bloqueo por cuenta en la DB
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos desde tu IP. Espera 15 minutos e inténtalo de nuevo.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login',            authRateLimit);
app.use('/api/auth/forgot-password',  authRateLimit);
app.use('/api/auth/reset-password',   authRateLimit);

// Guardar rawBody solo para el webhook de Meta (necesario para verificar firma)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhook')) {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      req.rawBody = data;
      try { req.body = JSON.parse(data || '{}'); } catch { req.body = {}; }
      next();
    });
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// ─── Lazy route loader ────────────────────────────────────────────────────────
function safeRoute(path) {
  const proxy = express.Router();
  let _router = null, _error = null;
  proxy.use((req, res, next) => {
    if (!_router && !_error) {
      try {
        const r = require(path);
        _router = (typeof r === 'function') ? r : (r && r.router) || (r && r.default) || null;
        if (!_router) throw new Error('Not a valid router export');
      } catch(e) {
        _error = e.message;
        console.warn(`⚠️  Route ${path} failed: ${e.message}`);
      }
    }
    if (_error) return res.status(503).json({ error: `Route unavailable: ${path}` });
    _router(req, res, next);
  });
  return proxy;
}

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        safeRoute('./routes/auth'));
app.use('/api/admin',       safeRoute('./routes/admin'));
app.use('/api/supervisor',  safeRoute('./routes/supervisor'));
app.use('/api/asesor',      safeRoute('./routes/asesor'));
app.use('/api/clients',     safeRoute('./routes/clients'));
app.use('/api/users',       safeRoute('./routes/users'));
// '/api/dashboard' (routes/dashboard.js) ELIMINADO 2026-06-22: endpoint legacy con datos demo (store en memoria).
// Los dashboards reales usan /api/{admin,supervisor,asesor,superadmin}/stats sobre Postgres.
app.use('/api/messages',    safeRoute('./routes/messages'));
app.use('/api/superadmin',  safeRoute('./routes/superadmin'));
app.use('/api/export',      safeRoute('./routes/export'));
app.use('/api/webhook',     safeRoute('./routes/webhook')); // Meta Cloud API
app.use('/webhook',         safeRoute('./routes/webhook')); // fallback
app.use('/api/push',        safeRoute('./routes/push'));    // Push notifications
app.use('/api/uploads',     express.static(path.join(__dirname, 'uploads')));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` }));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

// ─── Migración de columnas (idempotente y silenciosa) ─────────────────────────
// Solo intenta agregar las columnas que REALMENTE faltan. Si están todas (caso
// normal en producción) no ejecuta ningún ALTER, así no aparece el warning
// "must be owner of table". Si falta alguna y el usuario de DB no es dueño de la
// tabla, lo reporta con un mensaje accionable en vez de tragarse el error.
async function ensureColumns(table, columns) {
  try {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [table]
    );
    const existing = new Set(rows.map(r => r.column_name));
    const missing  = Object.entries(columns).filter(([name]) => !existing.has(name));
    if (!missing.length) return; // nada que migrar

    const defs = missing.map(([name, type]) => `ADD COLUMN ${name} ${type}`).join(', ');
    try {
      await pool.query(`ALTER TABLE ${table} ${defs}`);
      console.log(`✅ ${table}: columnas agregadas → ${missing.map(([n]) => n).join(', ')}`);
    } catch (e) {
      console.error(`🔴 No se pudieron crear columnas en "${table}" (faltan: ${missing.map(([n]) => n).join(', ')}). ` +
        `Causa: ${e.message}. Ejecuta la migración como el rol dueño de la tabla o transfiere ownership a ${process.env.DB_USER}.`);
    }
  } catch (e) {
    console.warn(`⚠️  No se pudo verificar columnas de ${table}:`, e.message);
  }
}

// ─── Arranque ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, async () => {
  console.log(`\n🚀 CRM Backend corriendo en http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);

  await ensureColumns('companies', {
    wa_phone_id: 'VARCHAR(50)', wa_token: 'TEXT', product_info: 'TEXT',
    card_bg: 'VARCHAR(20)', bot_prompt: 'TEXT', bot_filtro_prompt: 'TEXT',
  });
  await ensureColumns('users', {
    login_attempts: 'INT DEFAULT 0', locked_until: 'TIMESTAMPTZ NULL',
    force_password_change: 'BOOLEAN DEFAULT FALSE', reset_code: 'VARCHAR(10)',
    reset_code_expires: 'TIMESTAMPTZ NULL', reset_code_attempts: 'INT DEFAULT 0',
  });
  await ensureColumns('leads', {
    handoff: 'BOOLEAN DEFAULT FALSE', handoff_reason: 'VARCHAR(50)', handoff_at: 'TIMESTAMPTZ',
    metadata: "JSONB DEFAULT '{}'", advisor_active: 'BOOLEAN DEFAULT FALSE',
    advisor_last_msg: 'TIMESTAMPTZ', followup_1_at: 'TIMESTAMPTZ',
    followup_2_at: 'TIMESTAMPTZ', cedula: 'VARCHAR(13)',
  });
  await ensureColumns('bot_config', {
    usage_month: "VARCHAR(7) DEFAULT ''", monthly_input_tok: 'BIGINT DEFAULT 0',
    monthly_output_tok: 'BIGINT DEFAULT 0', monthly_cache_write_tok: 'BIGINT DEFAULT 0',
    monthly_cache_read_tok: 'BIGINT DEFAULT 0',
    msg_retention_months: 'INT DEFAULT NULL', reengagement_days: 'INT DEFAULT NULL',
  });

  // Busimott: 2 meses retención de mensajes, regestión a los 7 días (solo setea si está NULL)
  try {
    await pool.query(`
      UPDATE bot_config SET
        msg_retention_months = COALESCE(msg_retention_months, 2),
        reengagement_days    = COALESCE(reengagement_days, 7)
      WHERE company_id = (SELECT id FROM companies WHERE name ILIKE '%busimott%' LIMIT 1);
    `);
  } catch(e) { console.warn('⚠️  defaults retención Busimott:', e.message); }

  try {
    const { startNightCron, startFollowUpCron, startReengagementCron } = require('./jobs/nightCron');
    startNightCron(app);
    startFollowUpCron(app);
    startReengagementCron(app);
    console.log('🤖 Bot WhatsApp + Cron 4am + Regestión 9am activos');
  } catch(e) {
    console.warn('⚠️  Cron no iniciado:', e.message);
  }
});

module.exports = { app, io };
