// C:\Users\HP\MediTrack\routes\webhook.routes.js

const express = require('express');

const router = express.Router();

const webhookController = require('../controllers/webhook.controller');

const { auditLog } = require('../middleware/auditLogger');

// ============================================================
// RESEND WEBHOOK
// ============================================================
//
// IMPORTANT:
// Svix must receive the ORIGINAL request body.
//
// Therefore this route uses express.raw() instead of express.json().
//

router.post(
  '/resend',

  express.raw({
    type: 'application/json',
  }),

  (req, res, next) => {
    req.rawBody = req.body;
    next();
  },

  auditLog(
    'Process Resend Webhook',
    'EMAIL WEBHOOK',
    (req, res) =>
      res.locals.auditDescription ||
      'Processed Resend webhook.'
  ),

  webhookController.handleResendWebhook
);

module.exports = router;