const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const upload = require('../middleware/upload');
const rateLimit = require('express-rate-limit');

// Handles IPv4 + IPv6 safely for rate-limit keys
const { ipKeyGenerator } = require('express-rate-limit');

// Authentication / Authorization middleware
const { authorized } = require('../middleware/authorized');
const { requireSysadmin } = require('../middleware/roleBasedAccess');

// Audit logger
const { auditLog } = require('../middleware/auditLogger');

const supabase = require('../configs/database');

// ---------------------------------------------------------
// RATE-LIMIT KEY GENERATOR
// ---------------------------------------------------------
//
// Uses the IP address that Express resolved after processing
// the proxy headers.
//
// This means:
//
// User A → IP A → rate-limit bucket A
// User B → IP B → rate-limit bucket B
//
// IPv6 addresses are normalized safely using
// express-rate-limit's ipKeyGenerator helper.
//
// ---------------------------------------------------------

const clientIpKey = (req) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';

  return ipKeyGenerator(ip);
};


// ---------------------------------------------------------
// RATE LIMITERS
// ---------------------------------------------------------

/**
 * Login
 *
 * Maximum of 5 attempts per IP every 15 minutes.
 *
 * Different users with different IPs receive separate
 * rate-limit buckets.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 5,

  keyGenerator: clientIpKey,

  message: {
    success: false,
    message:
      'Too many login attempts, please try again after 15 minutes.'
  },

  standardHeaders: true,
  legacyHeaders: false,
});


/**
 * Email-related requests
 *
 * Used for:
 * - Forgot password
 * - Send verification
 * - Admin resend verification
 */
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,

  max: 10,

  keyGenerator: clientIpKey,

  message: {
    success: false,
    message:
      'Too many email requests, please try again after an hour.'
  },

  standardHeaders: true,
  legacyHeaders: false,
});


/**
 * Registration
 *
 * Allows enough requests for users behind a shared
 * university/campus network while still limiting abuse.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,

  max: 50,

  keyGenerator: clientIpKey,

  message: {
    success: false,
    message:
      'Too many accounts created from this network. Please try again later.'
  },

  standardHeaders: true,
  legacyHeaders: false,
});


// ---------------------------------------------------------
// PUBLIC AUTHENTICATION ROUTES
// ---------------------------------------------------------


/**
 * 1. REGISTER
 *
 * Public route.
 *
 * Users are not authenticated yet, so `authorized`
 * must NOT be used here.
 */
router.post(
  '/register',

  registerLimiter,

  upload.single('image'),

  auditLog(
    'register',
    'auth',
    (req) =>
      `Registered new user account: ${
        req.body.email || 'Unknown'
      }`
  ),

  authController.register
);


/**
 * 2. LOGIN
 *
 * Public route.
 *
 * `authorized` cannot be used because the user is
 * obtaining the access token here.
 */
router.post(
  '/login',

  loginLimiter,

  async (req, res, next) => {
    let userDetails = '';

    try {
      const email = req.body.email?.toLowerCase();

      if (email) {
        const { data: existingUser } = await supabase
          .from('users')
          .select(`
            first_name,
            middle_name,
            last_name,
            university_id
          `)
          .eq('email', email)
          .maybeSingle();

        if (existingUser) {
          userDetails = `
            ${existingUser.first_name || ''}
            ${existingUser.middle_name || ''}
            ${existingUser.last_name || ''}
          `
            .trim()
            .replace(/\s+/g, ' ');

          if (existingUser.university_id) {
            userDetails += ` (${existingUser.university_id})`;
          }
        }
      }

    } catch (error) {
      // Do not allow an audit lookup failure to
      // prevent the login request.
      console.error(
        '[Auth Routes] Login audit lookup failed:',
        error.message
      );
    }

    req.loginUserDetails =
      userDetails ||
      req.body.email ||
      'Unknown';

    next();
  },

  auditLog(
    'login',
    'auth',
    (req) => {
      const details = req.loginUserDetails
        ? ` - ${req.loginUserDetails}`
        : '';

      return (
        `User logged in: ` +
        `${req.body.email || 'Unknown'}` +
        details
      );
    }
  ),

  authController.login
);


/**
 * 3. FORGOT PASSWORD
 *
 * Public route.
 */
router.post(
  '/forgot-password',
  emailLimiter,
  authController.forgotPassword
);


/**
 * 4. RESET PASSWORD
 *
 * Public route.
 *
 * Authentication is performed using the secure
 * reset token instead of the normal access token.
 */
router.post(
  '/reset-password',
  authController.resetPassword
);


/**
 * 5. SEND EMAIL VERIFICATION
 *
 * Public route.
 */
router.post(
  '/send-verification',
  emailLimiter,
  authController.sendVerificationEmail
);


/**
 * 6. VERIFY EMAIL
 *
 * Public route.
 */
router.post(
  '/verify-email',
  authController.verifyEmail
);


// ---------------------------------------------------------
// PROTECTED AUTHENTICATION ROUTES
// ---------------------------------------------------------


/**
 * 7. ADMIN RESEND VERIFICATION
 *
 * Requires:
 *
 * 1. Valid Supabase JWT
 * 2. Sysadmin role
 */
router.post(
  '/admin-resend-verification',

  emailLimiter,

  authorized,

  requireSysadmin,

  auditLog(
    'resend_verification',
    'auth',
    (req) =>
      `Administrator ${
        req.user?.email || req.user?.uid || 'Unknown'
      } requested a verification email resend.`
  ),

  authController.adminResendVerification
);


// ---------------------------------------------------------
// EXPORT ROUTER
// ---------------------------------------------------------

module.exports = router;