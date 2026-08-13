/**
 * C:\Users\HP\MediTrack\middleware\roleBasedAccess.js
 *
 * Role-Based Access Control (RBAC) Middleware
 *
 * IMPORTANT:
 * This middleware should be used AFTER `authorized`.
 *
 * Examples:
 *
 * requireRole('sysadmin')
 *
 * OR
 *
 * requireRole(['sysadmin', 'faculty', 'staff'])
 */

const requireRole = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      const userRole = String(req.user.role || '')
        .trim()
        .toLowerCase();

      if (!userRole) {
        console.warn(
          `[RBAC] User ${req.user.uid || 'unknown'} has no assigned role.`
        );

        return res.status(403).json({
          success: false,
          message: 'Access denied. No role assigned to this account.'
        });
      }

      // Supports both:
      // requireRole('sysadmin')
      // requireRole('sysadmin', 'faculty', 'staff')
      // requireRole(['sysadmin', 'faculty', 'staff'])
      const normalizedAllowedRoles = roles
        .flat(Infinity)
        .map(role =>
          String(role)
            .trim()
            .toLowerCase()
        );

      if (!normalizedAllowedRoles.includes(userRole)) {
        console.warn(
          `[RBAC] Access denied: ${
            req.user.email || req.user.uid || 'unknown'
          } (${userRole}) attempted to access a restricted resource. ` +
          `Required role(s): ${normalizedAllowedRoles.join(', ')}`
        );

        return res.status(403).json({
          success: false,
          message:
            'Access denied. You do not have permission to perform this action.'
        });
      }

      next();

    } catch (error) {
      console.error('[RBAC] Role authorization error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to verify access permissions.'
      });
    }
  };
};


// Sysadmin-only
const requireSysadmin = requireRole('sysadmin');


// Staff-level roles
const requireStaff = requireRole(
  'sysadmin',
  'doctor',
  'dentist',
  'nurse',
  'lecturer',
  'professor',
  'instructor',
  'librarian',
  'technician',
  'guard',
  'staff'
);


module.exports = {
  requireRole,
  requireSysadmin,
  requireStaff
};