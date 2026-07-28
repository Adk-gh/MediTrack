//C:\Users\HP\MediTrack\routes\auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const upload = require('../middleware/upload');

// 1. Import the audit logger
const { auditLog } = require('../middleware/auditLogger');
const supabase = require('../configs/database');


// 1. Signup: Includes the 'image' upload middleware for OCR verification
router.post('/register',
  upload.single('image'),
  auditLog('register', 'auth', (req) => `Registered new user account: ${req.body.email || 'Unknown'}`),
  authController.register
);

// 2. Login: Maps the /login path to your controller logic
router.post('/login',
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
router.post('/forgot-password', authController.forgotPassword);

// 4. Reset Password: Update password with token
router.post('/reset-password', authController.resetPassword);

module.exports = router;