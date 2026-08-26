// C:\Users\HP\MediTrack\routes\auth.routes.js

const express = require('express');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const router = express.Router();

const authController = require('../controllers/auth.controller');
const upload = require('../middleware/upload');
const { authorized } = require('../middleware/authorized');
const { auditLog } = require('../middleware/auditLogger');
const supabase = require('../configs/database');

const {
  getSystemConfig,
} = require('../services/systemConfig.service');

// ============================================================
// HELPERS
// ============================================================

const normalizeRole = (role) => {
  return String(role || '')
    .trim()
    .toLowerCase();
};

const normalizeConfiguredRoles = (roles) => {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map(normalizeRole)
    .filter(Boolean);
};

const normalizeEmail = (email) => {
  return String(email || '')
    .trim()
    .toLowerCase();
};

const buildFullName = (user = {}) => {
  return [
    user.first_name || user.firstName,
    user.middle_name || user.middleName,
    user.last_name || user.lastName,
  ]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(' ');
};

const clientIpKey = (req) => {
  const ip =
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';

  return ipKeyGenerator(ip);
};

// ============================================================
// DYNAMIC ADMIN ROLE MIDDLEWARE
// ============================================================

// Allows configured admin roles and sysadmin only.
//
// Doctors, dentists, and nurses are intentionally excluded
// because this middleware is for administrative operations.
const allowDynamicAdmin = async (
  req,
  res,
  next
) => {
  try {
    const userRole = normalizeRole(
      req.user?.role
    );

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. No role found.',
      });
    }

    const config = await getSystemConfig();

    const adminRoles =
      normalizeConfiguredRoles(
        config?.admin_roles
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

// ============================================================
// AUDIT ENRICHMENT MIDDLEWARES
// ============================================================

const attachLoginAuditDetails = async (
  req,
  res,
  next
) => {
  try {
    const email = normalizeEmail(
      req.body?.email
    );

    if (!email) {
      req.loginUserDetails = 'Unknown';
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
        '[Auth Routes] Login audit lookup failed:',
        error.message
      );

      req.loginUserDetails = email;
      return next();
    }

    if (!existingUser) {
      req.loginUserDetails = email;
      return next();
    }

    const fullName =
      buildFullName(existingUser);

    const universityId =
      existingUser.university_id
        ? ` (${existingUser.university_id})`
        : '';

    req.loginUserDetails =
      fullName
        ? `${fullName}${universityId}`
        : existingUser.email || email;

    req.loginAuditDetails = {
      userId: existingUser.uid,
      email: existingUser.email,
      fullName: fullName || null,
      universityId:
        existingUser.university_id || null,
      role: existingUser.role || null,
    };

    return next();
  } catch (error) {
    console.error(
      '[Auth Routes] Login audit enrichment failed:',
      error.message
    );

    req.loginUserDetails =
      normalizeEmail(req.body?.email) ||
      'Unknown';

    return next();
  }
};

const attachTargetUserAuditDetails = async (
  req,
  res,
  next
) => {
  try {
    const targetUserId =
      req.body?.userId;

    if (!targetUserId) {
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
          is_verified
        `
      )
      .eq('uid', targetUserId)
      .maybeSingle();

    if (error) {
      console.error(
        '[Auth Routes] Target-user audit lookup failed:',
        error.message
      );

      return next();
    }

    if (targetUser) {
      req.targetUserDetails = {
        uid: targetUser.uid,
        email: targetUser.email,
        fullName:
          buildFullName(targetUser) || null,
        universityId:
          targetUser.university_id || null,
        isVerified:
          Boolean(targetUser.is_verified),
      };
    }

    return next();
  } catch (error) {
    console.error(
      '[Auth Routes] Target-user audit enrichment failed:',
      error.message
    );

    return next();
  }
};

// ============================================================
// RATE LIMITERS
// ============================================================

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: clientIpKey,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many failed login attempts. Please try again after 15 minutes.',
  },
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: clientIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many email requests. Please try again after an hour.',
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  keyGenerator: clientIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many accounts created from this network. Please try again later.',
  },
});

// ============================================================
// REGISTER
// ============================================================

router.post(
  '/register',
  registerLimiter,

  // Multer must run before auditLog so multipart fields
  // such as email are available through req.body.
  upload.single('image'),

  auditLog(
    'Register User',
    'AUTHENTICATION',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const email =
        normalizeEmail(req.body?.email) ||
        'Unknown';

      const fullName = [
        req.body?.firstName,
        req.body?.middleName,
        req.body?.lastName,
      ]
        .filter(Boolean)
        .map((part) =>
          String(part).trim()
        )
        .filter(Boolean)
        .join(' ');

      return fullName
        ? `Registered new user account for ${fullName} (${email}).`
        : `Registered new user account: ${email}.`;
    }
  ),

  authController.register
);

// ============================================================
// LOGIN
// ============================================================

router.post(
  '/login',
  loginLimiter,

  attachLoginAuditDetails,

  auditLog(
    'User Login',
    'AUTHENTICATION',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const email =
        normalizeEmail(req.body?.email) ||
        'Unknown';

      const details =
        req.loginUserDetails &&
        req.loginUserDetails !== email
          ? ` - ${req.loginUserDetails}`
          : '';

      return (
        `User logged in: ${email}` +
        `${details}.`
      );
    }
  ),

  authController.login
);

// ============================================================
// FORGOT PASSWORD
// ============================================================

// This route intentionally does not reveal whether an account
// exists for the submitted email.
router.post(
  '/forgot-password',
  emailLimiter,

  auditLog(
    'Request Password Reset',
    'AUTHENTICATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Password reset requested for ${
          normalizeEmail(req.body?.email) ||
          'unknown email'
        }.`
      );
    }
  ),

  authController.forgotPassword
);

// ============================================================
// RESET PASSWORD
// ============================================================

router.post(
  '/reset-password',

  auditLog(
    'Reset Password',
    'AUTHENTICATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Password reset completed for ${
          normalizeEmail(req.body?.email) ||
          'unknown email'
        }.`
      );
    }
  ),

  authController.resetPassword
);

// ============================================================
// SEND VERIFICATION EMAIL
// ============================================================

router.post(
  '/send-verification',
  emailLimiter,

  auditLog(
    'Send Verification Email',
    'AUTHENTICATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Verification email requested for ${
          normalizeEmail(req.body?.email) ||
          'unknown email'
        }.`
      );
    }
  ),

  authController.sendVerificationEmail
);

// ============================================================
// VERIFY EMAIL
// ============================================================

router.post(
  '/verify-email',

  auditLog(
    'Verify Email',
    'AUTHENTICATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Verified email address ${
          normalizeEmail(req.body?.email) ||
          'unknown'
        }.`
      );
    }
  ),

  authController.verifyEmail
);

// ============================================================
// EMAIL DELIVERY STATUS
// ============================================================

router.get(
  '/email-status',
  authController.getEmailStatus
);

// ============================================================
// ADMIN RESEND VERIFICATION
// ============================================================

router.post(
  '/admin-resend-verification',
  emailLimiter,
  authorized,
  allowDynamicAdmin,

  // Read target details before the controller sends the email.
  attachTargetUserAuditDetails,

  auditLog(
    'Admin Resend Verification',
    'AUTHENTICATION',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const target =
        req.targetUserDetails;

      const targetLabel =
        target?.fullName ||
        target?.email ||
        req.body?.userId ||
        'Unknown user';

      return (
        `Administrator requested a verification email resend ` +
        `for ${targetLabel}.`
      );
    }
  ),

  authController.adminResendVerification
);

module.exports = router;