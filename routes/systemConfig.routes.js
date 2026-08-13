// C:\Users\HP\MediTrack\routes\systemConfig.routes.js
const express = require('express');
const router = express.Router();

const systemConfigController = require('../controllers/systemConfig.controller');

// GET /api/system-config
router.get('/', systemConfigController.getSystemConfig);

// PUT /api/system-config
router.put('/', systemConfigController.updateSystemConfig);

module.exports = router;