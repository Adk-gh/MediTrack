const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// The function name here MUST match what is exported in webhook.controller.js
router.post('/resend', webhookController.handleResendWebhook);

module.exports = router;