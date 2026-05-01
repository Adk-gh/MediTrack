//C:\Users\HP\MediTrack\routes\auth.routes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const upload = require('../middleware/upload');


// 1. Signup: Includes the 'image' upload middleware for OCR verification
router.post('/signup', upload.single('image'), authController.register);

// 2. Login: ADD THIS LINE. It maps the /login path to your controller logic
router.post('/login', authController.login); 

module.exports = router;