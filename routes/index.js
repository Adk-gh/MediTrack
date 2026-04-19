require('dotenv').config();
const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes'); // The file we created earlier

// This makes the path: http://localhost:5000/api/auth/signup
router.use('/auth', authRoutes);

// ... your other existing routes (userRoutes, etc.)
// router.use('/users', userRoutes);

module.exports = router;