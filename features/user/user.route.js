// C:\Users\HP\MediTrack\features\user\user.route.js

const express = require('express');
const router = express.Router();

const multer = require('multer');

const userController = require('./user.controller');

const { authorized } = require('../../middleware/authorized');
const validateData = require('../../validation/validate-data');
const supabase = require('../../configs/database');

const { auditLog } = require('../../middleware/auditLogger');

const {
  registerSchema,
  loginSchema,
} = require('./user.validation');

const {
  getSystemConfig,
} = require('../../services/systemConfig.service');

const upload = multer({
  storage: multer.memoryStorage(),
});

// =========================================================
// HELPERS
// =========================================================

const buildFullName = (user = {}) => {
  return [
    user.first_name || user.firstName,
    user.middle_name || user.middleName,
    user.last_name || user.lastName,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(' ');
};

const attachTargetUserDetails = async (
  req,
  res,
  next
) => {
  try {
    const targetUid =
      req.params.userId ||
      req.body.targetUid ||
      null;

    if (!targetUid) {
      return next();
    }

    const {
      data: targetUser,
      error,
    } = await supabase
      .from('users')
      .select(
        `
          uid,
          email,
          first_name,
          middle_name,
          last_name,
          university_id,
          role
        `
      )
      .eq('uid', targetUid)
      .maybeSingle();

    if (error) {
      console.error(
        '[UserRoutes] Failed to load target user for audit:',
        error.message
      );

      return next();
    }

    if (targetUser) {
      req.targetUserDetails = {
        uid: targetUser.uid,
        email: targetUser.email,
        fullName: buildFullName(targetUser),
        universityId:
          targetUser.university_id || null,
        role: targetUser.role || null,
      };
    }

    return next();
  } catch (error) {
    console.error(
      '[UserRoutes] Target-user audit lookup failed:',
      error.message
    );

    // Audit enrichment must never block the actual request.
    return next();
  }
};

// =========================================================
// DYNAMIC ROLE MIDDLEWARES
// =========================================================

// Allows Admin Roles + Clinic Staffs.
const allowDynamicClinicStaffs = async (
  req,
  res,
  next
) => {
  try {
    const userRole = String(
      req.user?.role || ''
    )
      .trim()
      .toLowerCase();

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. No role found.',
      });
    }

    const config = await getSystemConfig();

    const clinicRoles = (
      config.clinic_roles || []
    ).map((role) =>
      String(role).trim().toLowerCase()
    );

    const adminRoles = (
      config.admin_roles || []
    ).map((role) =>
      String(role).trim().toLowerCase()
    );

    const allowedRoles = [
      ...new Set([
        ...clinicRoles,
        ...adminRoles,
        'sysadmin',
        'doctor',
        'dentist',
        'nurse',
      ]),
    ];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message:
        'Access denied. Clinic staff or Admin privileges required.',
    });
  } catch (error) {
    console.error(
      '[DynamicRoleCheck] Clinic staffs verification failed:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Internal server error during role validation.',
    });
  }
};

// Allows Admin Roles only.
const allowDynamicAdmin = async (
  req,
  res,
  next
) => {
  try {
    const userRole = String(
      req.user?.role || ''
    )
      .trim()
      .toLowerCase();

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. No role found.',
      });
    }

    const config = await getSystemConfig();

    const adminRoles = (
      config.admin_roles || []
    ).map((role) =>
      String(role).trim().toLowerCase()
    );

    const allowedRoles = [
      ...new Set([
        ...adminRoles,
        'sysadmin',
      ]),
    ];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message:
        'Access denied. Admin privileges required.',
    });
  } catch (error) {
    console.error(
      '[DynamicRoleCheck] Admin verification failed:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Internal server error during role validation.',
    });
  }
};

// =========================================================
// PUBLIC ROUTES
// =========================================================

router.get(
  '/check-id',
  userController.checkIdExists
);

// =========================================================
// REGISTRATION
// =========================================================

router.post(
  '/register',
  upload.single('image'),
  validateData(registerSchema),
  auditLog(
    'Register User',
    'AUTHENTICATION',
    (req, res) =>
      res.locals.auditDescription ||
      `Registered new user account: ${
        req.body?.email || 'Unknown'
      }`
  ),
  userController.register
);

// =========================================================
// LOGIN
// =========================================================

router.post(
  '/login',

  // Re-enable this when the submitted login payload
  // matches loginSchema exactly.
  // validateData(loginSchema),

  async (req, res, next) => {
    try {
      const email = req.body?.email;

      if (!email) {
        return next();
      }

      const {
        data: existingUser,
        error,
      } = await supabase
        .from('users')
        .select(
          `
            uid,
            email,
            first_name,
            middle_name,
            last_name,
            university_id,
            role
          `
        )
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error(
          '[UserRoutes] Login audit lookup failed:',
          error.message
        );

        return next();
      }

      if (existingUser) {
        const fullName =
          buildFullName(existingUser);

        req.loginUserDetails =
          fullName ||
          existingUser.email ||
          email;

        req.loginAuditDetails = {
          uid: existingUser.uid,
          email: existingUser.email,
          fullName: fullName || null,
          universityId:
            existingUser.university_id || null,
          role: existingUser.role || null,
        };
      } else {
        req.loginUserDetails = email;
      }

      return next();
    } catch (error) {
      console.error(
        '[UserRoutes] Login audit enrichment failed:',
        error.message
      );

      req.loginUserDetails =
        req.body?.email || 'Unknown';

      return next();
    }
  },

  auditLog(
    'User Login',
    'AUTHENTICATION',
    (req, res) =>
      res.locals.auditDescription ||
      `User logged in: ${
        req.loginUserDetails ||
        req.body?.email ||
        'Unknown'
      }`
  ),

  userController.login
);

// =========================================================
// USER PROFILE
// =========================================================

// Get own profile.
router.get(
  '/profile',
  authorized,
  userController.getProfile
);

// Check own profile setup.
router.get(
  '/profile-setup',
  authorized,
  userController.checkProfileSetup
);

// Complete initial profile setup.
router.post(
  '/profile-setup',
  authorized,
  auditLog(
    'Setup Profile',
    'USER PROFILE',
    (req, res) =>
      res.locals.auditDescription ||
      'User completed initial profile setup.'
  ),
  userController.setupProfile
);

// Toggle own profile completion.
router.put(
  '/profile-complete',
  authorized,
  auditLog(
    'Update Profile Completion',
    'USER PROFILE',
    (req, res) =>
      res.locals.auditDescription ||
      'User updated profile completion status.'
  ),
  userController.toggleProfileComplete
);

// Update own profile.
router.put(
  '/profile',
  authorized,
  auditLog(
    'Update Profile',
    'USER PROFILE',
    (req, res) =>
      res.locals.auditDescription ||
      'User updated their profile details.'
  ),
  userController.updateProfile
);

// =========================================================
// USER MANAGEMENT
// =========================================================

const getAllUsers = async (
  req,
  res,
  next
) => {
  try {
    const {
      data,
      error,
    } = await supabase
      .from('users')
      .select('*')
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      throw error;
    }

 const users = (data || []).map((user) => ({
  ...user,

  // Keep the real database ID.
  id: user.id,

  // Keep the Auth UID.
  uid: user.uid,
}));

    return res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// Admin + clinic staffs.
router.get(
  '/users',
  authorized,
  allowDynamicClinicStaffs,
  getAllUsers
);

// =========================================================
// DELETE / ARCHIVE USER
// =========================================================

router.delete(
  '/users/:userId',
  authorized,
  allowDynamicAdmin,

  // Fetch target details before the user is archived.
  attachTargetUserDetails,

  auditLog(
    'Archive User',
    'ARCHIVE',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const target =
        req.targetUserDetails;

      const targetLabel =
        target?.fullName ||
        target?.email ||
        req.params.userId;

      const universityId =
        target?.universityId
          ? ` (${target.universityId})`
          : '';

      return (
        `Archived user ${targetLabel}` +
        `${universityId} with UID ` +
        `${req.params.userId}.`
      );
    }
  ),

  userController.deleteUser
);

// =========================================================
// ADMIN USER UPDATE
// =========================================================

router.put(
  '/admin-update',
  authorized,
  allowDynamicAdmin,

  // Load the target before updating so the audit fallback
  // still has a proper name and UID.
  attachTargetUserDetails,

  auditLog(
    'Admin Update User',
    'USER MANAGEMENT',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const targetUid =
        req.body?.targetUid ||
        'Unknown';

      const target =
        req.targetUserDetails;

      const targetLabel =
        target?.fullName ||
        target?.email ||
        targetUid;

      return (
        `Administrator updated user ` +
        `${targetLabel} with UID ${targetUid}.`
      );
    }
  ),

  userController.adminUpdateUser
);

module.exports = router;