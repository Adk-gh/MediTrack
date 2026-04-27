require('dotenv').config();
const express = require('express');
const router = express.Router();

// 1. Auth Routes
const authRoutes = require('./auth.routes');
router.use('/auth', authRoutes);

// 2. Feature routes
const userRoutes = require('../features/user/user.route');
const recordsRoutes = require('../features/records/records.route');
const appointmentsRoutes = require('../features/appointments/appointments.route');
const examinationsRoutes = require('../features/examinations/examinations.route');
const announcementsRoutes = require('../features/announcements/announcements.route');

const profileSetupRoutes = require('../features/user/profile-setup/profile-setup');

router.use('/user/profile-setup', profileSetupRoutes);

router.use('/users', userRoutes);
router.use('/records', recordsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/examinations', examinationsRoutes);
router.use('/announcements', announcementsRoutes);

module.exports = router;