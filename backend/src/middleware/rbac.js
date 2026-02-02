// Role-Based Access Control Middleware

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  INTERNAL_MEMBER: 'internal_member',
  PUBLIC_USER: 'public_user'
};

const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        role: req.user.role,
        required: allowedRoles
      });
    }

    next();
  };
};

const requireSuperAdmin = roleMiddleware([ROLES.SUPER_ADMIN]);
const requireAdmin = roleMiddleware([ROLES.SUPER_ADMIN, ROLES.INTERNAL_MEMBER]);
const requireAuth = roleMiddleware([ROLES.SUPER_ADMIN, ROLES.INTERNAL_MEMBER, ROLES.PUBLIC_USER]);

module.exports = {
  ROLES,
  roleMiddleware,
  requireSuperAdmin,
  requireAdmin,
  requireAuth
};
