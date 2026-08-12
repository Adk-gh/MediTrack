// C:\Users\HP\MediTrack\routes\auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const upload = require('../middleware/upload');
const rateLimit = require('express-rate-limit'); // 👈 Import express-rate-limit

// 1. Import the audit logger
const { auditLog } = require('../middleware/auditLogger');
const supabase = require('../configs/database');

// ---------------------------------------------------------
// RATE LIMITERS
// ---------------------------------------------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Too many email requests, please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // High enough for campus networks, low enough to stop bots
  message: { success: false, message: 'Too many accounts created from this network. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------------------
// ROUTES
// ---------------------------------------------------------

// 1. Signup: Includes rate limiter, image upload, audit log, and controller
router.post('/register',
  registerLimiter, // 👈 Placed first to block spam before processing images
  upload.single('image'),
  auditLog('register', 'auth', (req) => `Registered new user account: ${req.body.email || 'Unknown'}`),
  authController.register
);

// 2. Login: Maps the /login path to your controller logic
router.post('/login',
  loginLimiter, // 👈 Add login limiter here
  async (req, res, next) => {
    // Get user details for audit log
    let userDetails = '';
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('first_name, middle_name, last_name, university_id')
        .eq('email', req.body.email)
        .single();

      if (existingUser) {
        userDetails = `${existingUser.first_name || ''} ${existingUser.middle_name || ''} ${existingUser.last_name || ''}`.trim().replace(/\s+/g, ' ');
        if (existingUser.university_id) {
          userDetails += ` (${existingUser.university_id})`;
        }
      }
    } catch (e) {}

    req.loginUserDetails = userDetails || req.body.email;
    next();
  },
  auditLog('login', 'auth', (req) => {
    const details = req.loginUserDetails ? ` - ${req.loginUserDetails}` : '';
    return `User logged in: ${req.body.email || 'Unknown'}${details}`;
  }),
  authController.login
);

// 3. Forgot Password: Send password reset email
router.post('/forgot-password', emailLimiter, authController.forgotPassword); // 👈 Apply email limiter

// 4. Reset Password: Update password with token
router.post('/reset-password', authController.resetPassword);

// 5. Send Email Verification
router.post('/send-verification', emailLimiter, authController.sendVerificationEmail); // 👈 Apply email limiter

// 6. Verify Email
router.post('/verify-email', authController.verifyEmail);

// 7. Admin: Resend Verification Email
router.post('/admin-resend-verification', emailLimiter, authController.adminResendVerification); // 👈 Apply email limiter

module.exports = router;