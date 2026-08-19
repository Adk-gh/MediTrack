const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const upload = require('../middleware/upload');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { authorized } = require('../middleware/authorized');
const { auditLog } = require('../middleware/auditLogger');
const supabase = require('../configs/database');
const { getSystemConfig } = require('../services/systemConfig.service');

// Dynamic Role Middleware for Admins
const allowDynamicAdmin = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!userRole) return res.status(403).json({ message: "Access denied. No role found." });

    const config = await getSystemConfig();
    const adminRoles = (config.admin_roles || []).map(r => r.toLowerCase());
    const allowedRoles = [...adminRoles, "sysadmin", "doctor", "dentist", "nurse"];

    if (allowedRoles.includes(userRole)) return next();
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  } catch (error) {
    console.error("[DynamicRoleCheck] Admin verification failed:", error);
    return res.status(500).json({ message: "Internal server error during role validation." });
  }
};

// Rate Limiters
const clientIpKey = (req) => ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown');
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyGenerator: clientIpKey, message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' }, standardHeaders: true, legacyHeaders: false });
const emailLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyGenerator: clientIpKey, message: { success: false, message: 'Too many email requests, please try again after an hour.' }, standardHeaders: true, legacyHeaders: false });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 50, keyGenerator: clientIpKey, message: { success: false, message: 'Too many accounts created from this network. Please try again later.' }, standardHeaders: true, legacyHeaders: false });

// Public Routes
router.post('/register', registerLimiter, upload.single('image'), auditLog('register', 'auth', (req) => `Registered new user account: ${req.body.email || 'Unknown'}`), authController.register);

router.post('/login', loginLimiter, async (req, res, next) => {
  let userDetails = '';
  try {
    const email = req.body.email?.toLowerCase();
    if (email) {
      const { data: existingUser } = await supabase.from('users').select(`first_name, middle_name, last_name, university_id`).eq('email', email).maybeSingle();
      if (existingUser) {
        userDetails = `${existingUser.first_name || ''} ${existingUser.middle_name || ''} ${existingUser.last_name || ''}`.trim().replace(/\s+/g, ' ');
        if (existingUser.university_id) userDetails += ` (${existingUser.university_id})`;
      }
    }
  } catch (error) {
    console.error('[Auth Routes] Login audit lookup failed:', error.message);
  }
  req.loginUserDetails = userDetails || req.body.email || 'Unknown';
  next();
}, auditLog('login', 'auth', (req) => `User logged in: ${req.body.email || 'Unknown'}${req.loginUserDetails ? ` - ${req.loginUserDetails}` : ''}`), authController.login);

router.post('/forgot-password', emailLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/send-verification', emailLimiter, authController.sendVerificationEmail);
router.post('/verify-email', authController.verifyEmail);
router.get('/email-status', authController.getEmailStatus);

// Protected Routes
router.post('/admin-resend-verification', emailLimiter, authorized, allowDynamicAdmin, auditLog('resend_verification', 'auth', (req) => `Administrator ${req.user?.email || req.user?.uid || 'Unknown'} requested a verification email resend.`), authController.adminResendVerification);

module.exports = router;