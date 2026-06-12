// C:\Users\HP\MediTrack\routes\index.js
require('dotenv').config();
const express = require('express');
const router = express.Router();

// 1. Auth Routes
const authRoutes = require('./auth.routes');
router.use('/auth', authRoutes);


// 2. Feature routes
const userRoutes = require('../features/user/user.route');
const recordsRoutes = require('../features/Records/records.route');
const appointmentsRoutes = require('../features/appointments/appointments.route');
const examinationsRoutes = require('../features/examinations/examinations.route');
const announcementsRoutes = require('../features/announcements/announcements.route');
const notificationsRoutes = require('../features/notifications/notifications.route');
const consultationsRoutes = require('../features/consultations/consultations.route');
const archivesRoutes = require('../features/archives/archives.route');

// 🔴 FIX 1: Commented out the 'hijacker' route so it doesn't intercept our new code
// const profileSetupRoutes = require('../features/user/profile-setup/profile-setup');
// router.use('/user/profile-setup', profileSetupRoutes);

// 🟢 FIX 2: Changed '/users' to '/user' (singular)
// Now, when the frontend calls /api/user/profile-setup, it goes straight to user.route.js!
router.use('/user', userRoutes);

router.use('/records', recordsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/examinations', examinationsRoutes);
router.use('/announcements', announcementsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/consultations', consultationsRoutes);
router.use('/archives', archivesRoutes);

module.exports = router;