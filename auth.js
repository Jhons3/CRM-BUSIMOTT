// CRM Sales - Middleware de Autenticación
const jwt = require('jsonwebtoken');

// Lazy load para evitar dependencia circular
function getQuery() {
  return require('../config/db').query;
}

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_local_only');
    const query = getQuery();

    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role,
              u.company_id AS "companyId",
              u.phone, u.status, u.avatar_url
       FROM users u WHERE u.id = $1`,
      [decoded.id]
    );

    if (!rows.length)
      return res.status(401).json({ error: 'Usuario no encontrado' });
    if (rows[0].status !== 'active')
      return res.status(403).json({ error: 'Usuario inactivo' });

    // Bloquear si la empresa está suspendida (no aplica a super_admin)
    if (rows[0].role !== 'super_admin' && rows[0].companyId) {
      const { rows: co } = await query(
        'SELECT status, suspension_reason FROM companies WHERE id = $1',
        [rows[0].companyId]
      );
      if (co.length && co[0].status === 'suspended') {
        return res.status(403).json({
          error: 'Empresa suspendida. ' + (co[0].suspension_reason || 'Contacta al administrador.'),
          suspended: true,
        });
      }
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Token inválido o expirado' });
    console.error('Auth middleware error:', err.message);
    res.status(500).json({ error: 'Error de autenticación' });
  }
}

function adminOnly(req, res, next) {
  if (!['admin', 'super_admin'].includes(req.user?.role))
    return res.status(403).json({ error: 'Acceso denegado: solo administradores' });
  next();
}

module.exports = { authMiddleware, adminOnly };
