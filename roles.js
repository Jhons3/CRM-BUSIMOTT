// =============================================
// CRM Sales - Middleware de Roles
// =============================================

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}` });
    }
    next();
  };
}

// Solo super_admin
const onlySuperAdmin = requireRole('super_admin');

// Solo admin o super_admin
const onlyAdmin = requireRole('admin', 'super_admin');

// Solo supervisor o superior
const onlySupervisor = requireRole('supervisor', 'admin', 'super_admin');

// Cualquier usuario autenticado
const anyRole = requireRole('asesor', 'supervisor', 'admin', 'super_admin');

module.exports = {
  requireRole,
  onlySuperAdmin,
  onlyAdmin,
  onlySupervisor,
  anyRole,
};
