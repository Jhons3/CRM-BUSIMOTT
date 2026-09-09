// =============================================
// CRM Sales - Servidor Principal (PostgreSQL)
// =============================================
require('dotenv').config();

// ─── Validación de secrets críticos ──────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET)   throw new Error('🔴 FATAL: JWT_SECRET no está en .env — el servidor NO puede arrancar en producción sin él');
  if (!process.env.DB_PASSWORD)  throw new Error('🔴 FATAL: DB_PASSWORD no está en .env — el servidor NO puede arrancar en producción sin él');
}
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
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
app.use('/api/dashboard',   safeRoute('./routes/dashboard'));
app.use('/api/messages',    safeRoute('./routes/messages'));
app.use('/api/superadmin',  safeRoute('./routes/superadmin'));
app.use('/api/export',      safeRoute('./routes/export'));
app.use('/api/webhook',     safeRoute('./routes/webhook')); // Meta Cloud API
app.use('/webhook',         safeRoute('./routes/webhook')); // fallback
app.use('/api/push',        safeRoute('./routes/push'));    // Push notifications

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

// ─── Arranque ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, async () => {
  console.log(`\n🚀 CRM Backend corriendo en http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);

  try {
    await pool.query(`
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS wa_phone_id       VARCHAR(50);
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS wa_token           TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS product_info       TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS card_bg            VARCHAR(20);
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS bot_prompt         TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS bot_filtro_prompt  TEXT;
    `);
  } catch(e) { /* ya existen */ }

  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts       INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until         TIMESTAMPTZ NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code           VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires   TIMESTAMPTZ NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_attempts  INT DEFAULT 0;
    `);
  } catch(e) { /* ya existen */ }

  // ── Columnas para HANDOFF, flujo scriptado y control de asesor en leads ───
  try {
    await pool.query(`
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS handoff            BOOLEAN    DEFAULT FALSE;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS handoff_reason     VARCHAR(50);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS handoff_at         TIMESTAMPTZ;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata           JSONB      DEFAULT '{}';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS advisor_active     BOOLEAN    DEFAULT FALSE;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS advisor_last_msg   TIMESTAMPTZ;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_1_at      TIMESTAMPTZ;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_2_at      TIMESTAMPTZ;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS cedula             VARCHAR(13);
    `);
    console.log('✅ Columnas de leads listas (handoff, metadata, advisor_active)');
  } catch(e) { console.warn('⚠️  leads cols:', e.message); }

  // ── Columnas para control de presupuesto mensual en bot_config ─────────────
  try {
    await pool.query(`
      ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS usage_month            VARCHAR(7)  DEFAULT '';
      ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS monthly_input_tok      BIGINT      DEFAULT 0;
      ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS monthly_output_tok     BIGINT      DEFAULT 0;
      ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS monthly_cache_write_tok BIGINT     DEFAULT 0;
      ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS monthly_cache_read_tok  BIGINT     DEFAULT 0;
    `);
    console.log('✅ Columnas de uso mensual listas en bot_config');
  } catch(e) { console.warn('⚠️  bot_config usage cols:', e.message); }

  // ── Columnas de retención de mensajes y regestión por empresa ─────────────
  try {
    await pool.query(`
      ALTER TABLE bot_config
        ADD COLUMN IF NOT EXISTS msg_retention_months INT DEFAULT NULL;
      ALTER TABLE bot_config
        ADD COLUMN IF NOT EXISTS reengagement_days    INT DEFAULT NULL;
    `);
    // Busimott: 2 meses retención de mensajes, regestión a los 7 días
    await pool.query(`
      UPDATE bot_config SET
        msg_retention_months = COALESCE(msg_retention_months, 2),
        reengagement_days    = COALESCE(reengagement_days, 7)
      WHERE company_id = (SELECT id FROM companies WHERE name ILIKE '%busimott%' LIMIT 1);
    `);
    console.log('✅ Retención de mensajes (2 meses) y regestión (7 días) configurados para Busimott');
  } catch(e) { console.warn('⚠️  bot_config cols:', e.message); }

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
