// =============================================
// CRM Sales - Auth con PostgreSQL + bcrypt
// =============================================
const express  = require('express');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcrypt');
const router   = express.Router();
const { query } = require('../config/db');
const { logAction } = require('../services/auditService');
const { sendRecoveryCodeEmail, sendLoginAlertEmail } = require('../services/emailService');
// Lazy load to avoid circular dependency
const getAuth = () => require('../middleware/auth').authMiddleware;

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const { rows } = await query(
      `SELECT u.*, c.name AS company_name, c.id AS cid, c.settings AS company_settings,
              c.primary_color, c.secondary_color, c.sidebar_color, c.bg_color, c.card_bg, c.logo_url
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE LOWER(u.email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = rows[0];

    // Verificar que el usuario esté activo
    if (user.status !== 'active')
      return res.status(403).json({ error: 'Usuario inactivo. Contacta al administrador.' });

    // Verificar bloqueo por intentos fallidos
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({
        error: 'Tu cuenta ha sido bloqueada por múltiples intentos fallidos. Solicita al administrador del sistema que restablezca tu contraseña.',
        locked: true,
      });
    }

    // Verificar que la empresa NO esté suspendida (no aplica a super_admin)
    if (user.role !== 'super_admin' && user.company_id) {
      const { rows: compRows } = await query(
        'SELECT status, suspension_reason FROM companies WHERE id = $1', [user.company_id]
      );
      if (compRows.length && compRows[0].status === 'suspended') {
        const reason = compRows[0].suspension_reason || 'Contacta al administrador del sistema.';
        return res.status(403).json({
          error: `Acceso suspendido. ${reason}`,
          suspended: true,
          reason,
        });
      }
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (user.login_attempts || 0) + 1;
      if (attempts >= 5) {
        await query(
          `UPDATE users SET login_attempts=$1, locked_until='2099-12-31' WHERE id=$2`,
          [attempts, user.id]
        );
        return res.status(403).json({
          error: 'Tu cuenta ha sido bloqueada por seguridad tras demasiados intentos fallidos. Solicita al administrador del sistema que restablezca tu contraseña.',
          locked: true,
        });
      }
      await query('UPDATE users SET login_attempts=$1 WHERE id=$2', [attempts, user.id]);
      const restantes = 5 - attempts;
      return res.status(401).json({
        error: `Credenciales inválidas. Te queda${restantes===1?'':'n'} ${restantes} intento${restantes===1?'':'s'} antes de bloquear la cuenta.`,
      });
    }

    // Login exitoso — resetear intentos
    await query(
      'UPDATE users SET last_login=NOW(), login_attempts=0, locked_until=NULL WHERE id=$1',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, companyId: user.company_id, name: user.name },
      process.env.JWT_SECRET || 'dev_secret_local_only',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logAction({
      userId: user.id, companyId: user.company_id,
      action: 'LOGIN', entity: 'user', entityId: user.id,
      details: `Login exitoso: ${user.email} (${user.role})`,
      ip: req.ip,
    }).catch(()=>{});

    // Alerta de seguridad por correo — para todos los usuarios, en cada inicio de sesión
    sendLoginAlertEmail({
      toEmail: user.email,
      toName:  user.name,
      ip:      req.ip,
      device:  req.headers['user-agent'] || 'Desconocido',
      time:    new Date().toLocaleString('es-EC', { timeZone: process.env.TZ || 'America/Guayaquil', dateStyle: 'long', timeStyle: 'short' }),
    }).catch(()=>{});

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, companyId: user.company_id,
        phone: user.phone, avatarUrl: user.avatar_url, status: user.status,
        forcePasswordChange: user.force_password_change || false,
      },
      company: user.company_id ? {
        id: user.company_id, name: user.company_name,
        primaryColor: user.primary_color, secondaryColor: user.secondary_color,
        sidebarColor: user.sidebar_color, bgColor: user.bg_color, cardBg: user.card_bg, logoUrl: user.logo_url,
        settings: user.company_settings || {},
      } : null,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/me
router.get('/me', (r,s,n)=>getAuth()(r,s,n), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.company_id,
              u.phone, u.avatar_url, u.status, u.last_login,
              u.force_password_change,
              c.name AS company_name, c.settings AS company_settings,
              c.primary_color, c.secondary_color, c.sidebar_color,
              c.bg_color, c.card_bg, c.logo_url
       FROM users u LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const u = rows[0];
    res.json({
      user: { id: u.id, name: u.name, email: u.email, role: u.role,
              companyId: u.company_id, phone: u.phone, avatarUrl: u.avatar_url,
              status: u.status, lastLogin: u.last_login,
              forcePasswordChange: u.force_password_change || false },
      company: u.company_id ? {
        id: u.company_id, name: u.company_name, settings: u.company_settings || {},
        primaryColor:   u.primary_color,
        secondaryColor: u.secondary_color,
        sidebarColor:   u.sidebar_color,
        bgColor:        u.bg_color,
        cardBg:         u.card_bg,
        logoUrl:        u.logo_url,
      } : null,
    });
  } catch (err) { res.status(500).json({ error: 'Error al obtener usuario' }); }
});

// POST /api/auth/force-change-password — para usuarios que deben cambiar contraseña al entrar
router.post('/force-change-password', (r,s,n)=>getAuth()(r,s,n), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres' });

    const { rows } = await query(
      'SELECT force_password_change FROM users WHERE id=$1', [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!rows[0].force_password_change)
      return res.status(403).json({ error: 'No tienes pendiente un cambio de contraseña' });

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password_hash=$1, force_password_change=FALSE WHERE id=$2',
      [hash, req.user.id]
    );
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (err) { res.status(500).json({ error: 'Error al cambiar contraseña' }); }
});

// POST /api/auth/change-password
router.post('/change-password', (r,s,n)=>getAuth()(r,s,n), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Se requieren ambas contraseñas' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'Mínimo 6 caracteres' });

    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) { res.status(500).json({ error: 'Error al cambiar contraseña' }); }
});

// POST /api/auth/forgot-password — solicita un código de recuperación por correo
router.post('/forgot-password', async (req, res) => {
  // Respuesta genérica siempre, para no revelar si el correo existe (anti-enumeración)
  const genericMsg = { message: 'Si el correo existe en nuestro sistema, enviamos un código de recuperación.' };
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Correo requerido' });

    const { rows } = await query(
      'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()]
    );
    if (!rows.length) return res.json(genericMsg);

    const user = rows[0];
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos

    await query(
      `UPDATE users
          SET reset_code = $1,
              reset_code_expires = NOW() + INTERVAL '15 minutes',
              reset_code_attempts = 0
        WHERE id = $2`,
      [code, user.id]
    );

    sendRecoveryCodeEmail({ toEmail: user.email, toName: user.name, code }).catch(()=>{});

    logAction({
      userId: user.id, companyId: null,
      action: 'PASSWORD_RECOVERY_REQUESTED', entity: 'user', entityId: user.id,
      details: `Código de recuperación solicitado para ${user.email}`,
      ip: req.ip,
    }).catch(()=>{});

    res.json(genericMsg);
  } catch (err) {
    console.error('Forgot-password error:', err);
    res.json(genericMsg);
  }
});

// POST /api/auth/reset-password — valida el código y establece la nueva contraseña
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword)
      return res.status(400).json({ error: 'Correo, código y nueva contraseña son requeridos' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres' });

    const { rows } = await query(
      'SELECT id, reset_code, reset_code_expires, reset_code_attempts FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()]
    );
    if (!rows.length) return res.status(400).json({ error: 'Código inválido o expirado' });

    const user = rows[0];

    if (!user.reset_code || !user.reset_code_expires || new Date(user.reset_code_expires) < new Date())
      return res.status(400).json({ error: 'Código inválido o expirado' });

    if ((user.reset_code_attempts || 0) >= 5) {
      await query('UPDATE users SET reset_code = NULL, reset_code_expires = NULL WHERE id = $1', [user.id]);
      return res.status(400).json({ error: 'Demasiados intentos fallidos. Solicita un nuevo código.' });
    }

    if (user.reset_code !== String(code).trim()) {
      await query('UPDATE users SET reset_code_attempts = reset_code_attempts + 1 WHERE id = $1', [user.id]);
      return res.status(400).json({ error: 'Código incorrecto' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE users
          SET password_hash = $1,
              reset_code = NULL,
              reset_code_expires = NULL,
              reset_code_attempts = 0,
              login_attempts = 0,
              locked_until = NULL,
              force_password_change = FALSE,
              updated_at = NOW()
        WHERE id = $2`,
      [hash, user.id]
    );

    logAction({
      userId: user.id, companyId: null,
      action: 'PASSWORD_RECOVERY_COMPLETED', entity: 'user', entityId: user.id,
      details: 'Contraseña restablecida vía código de recuperación',
      ip: req.ip,
    }).catch(()=>{});

    res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error('Reset-password error:', err);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

router.post('/logout', (r,s,n)=>getAuth()(r,s,n), (req, res) => res.json({ message: 'Sesión cerrada' }));

module.exports = router;
