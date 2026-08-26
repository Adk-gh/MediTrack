// C:\Users\HP\MediTrack\routes\systemConfig.route.js

const express = require('express');

const router = express.Router();

const systemConfigController = require('../controllers/systemConfig.controller');

const { authorized } = require('../middleware/authorized');

const {
  requireSysadmin,
} = require('../middleware/roleBasedAccess');

const {
  auditLog,
} = require('../middleware/auditLogger');

// ============================================================
// GET SYSTEM CONFIGURATION
// ============================================================
//
// Any authenticated user may read the configuration.
//

router.get(
  '/',
  authorized,
  systemConfigController.getSystemConfig
);

// ============================================================
// UPDATE SYSTEM CONFIGURATION
// ============================================================
//
// Only Sysadmins may modify the configuration.
//

router.put(
  '/',
  authorized,
  requireSysadmin,

  auditLog(
    'Update System Configuration',
    'SYSTEM CONFIGURATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        'Updated the system configuration.'
      );
    }
  ),

  systemConfigController.updateSystemConfig
);

module.exports = router;