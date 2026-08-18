const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Use express.raw just for this route to preserve the body for Svix signature verification
router.post(
  '/resend',
  express.raw({ type: 'application/json' }),
  webhookController.resendWebhook
);

module.exports = router;