//C:\Users\HP\MediTrack\routes\auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const upload = require('../middleware/upload');

// 1. Import the audit logger
const { auditLog } = require('../middleware/auditLogger');


// 1. Signup: Includes the 'image' upload middleware for OCR verification
router.post('/register',
  upload.single('image'),
  auditLog('register', 'auth', (req) => `Registered new user account: ${req.body.email || 'Unknown'}`),
  authController.register
);

// 2. Login: Maps the /login path to your controller logic
router.post('/login',
  auditLog('login', 'auth', (req) => `User logged in: ${req.body.email || 'Unknown'}`),
  authController.login
);

module.exports = router;