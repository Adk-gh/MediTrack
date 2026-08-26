// C:\Users\HP\MediTrack\controllers\webhook.controller.js

const { Webhook } = require('svix');
const supabase = require('../configs/database');

// ============================================================
// HELPERS
// ============================================================

const normalizeEmail = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase();
};

const getRecipientEmail = (event) => {
  const recipients = event?.data?.to;

  if (Array.isArray(recipients)) {
    return normalizeEmail(recipients[0]);
  }

  return normalizeEmail(recipients);
};

const getWebhookPayload = (req) => {
  // Svix must verify the exact request bytes that Resend sent.
  if (Buffer.isBuffer(req.rawBody)) {
    return req.rawBody.toString('utf8');
  }

  if (typeof req.rawBody === 'string') {
    return req.rawBody;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }

  if (typeof req.body === 'string') {
    return req.body;
  }

  // Fallback only. Exact rawBody is preferred.
  return JSON.stringify(req.body || {});
};

const getSvixHeaders = (req) => {
  return {
    'svix-id':
      req.get('svix-id') ||
      req.headers['svix-id'],

    'svix-timestamp':
      req.get('svix-timestamp') ||
      req.headers['svix-timestamp'],

    'svix-signature':
      req.get('svix-signature') ||
      req.headers['svix-signature'],
  };
};

const validateWebhookConfiguration = () => {
  if (!process.env.RESEND_WEBHOOK_SECRET) {
    const error = new Error(
      'RESEND_WEBHOOK_SECRET is not configured.'
    );

    error.statusCode = 500;
    throw error;
  }
};

const updateEmailStatus = async ({
  email,
  status,
  event,
}) => {
  const updatePayload = {
    email,
    status,
    updated_at: new Date().toISOString(),
  };

  // Include these only if the email_logs table has these columns.
  // Remove them if your schema contains only email/status/updated_at.
  if (event?.id) {
    updatePayload.event_id = event.id;
  }

  if (event?.type) {
    updatePayload.event_type = event.type;
  }

  const { data, error } = await supabase
    .from('email_logs')
    .upsert(updatePayload, {
      onConflict: 'email',
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error(
      '[ResendWebhook] Failed to update email status:',
      {
        email,
        status,
        error: error.message,
      }
    );

    throw error;
  }

  return data;
};

const setWebhookAuditData = (
  res,
  description,
  details = {}
) => {
  // Identity used by auditLogger.js.
  res.locals.auditUserId = 'resend-webhook';
  res.locals.auditUserEmail = 'webhook@resend.system';
  res.locals.auditUserName = 'Resend Webhook';

  res.locals.auditDescription = description;
  res.locals.auditDetails = {
    source: 'resend',
    operation: 'process_email_webhook',
    ...details,
  };
};

// ============================================================
// RESEND WEBHOOK
// ============================================================

exports.handleResendWebhook = async (
  req,
  res
) => {
  try {
    validateWebhookConfiguration();

    const payload = getWebhookPayload(req);
    const svixHeaders = getSvixHeaders(req);

    if (
      !svixHeaders['svix-id'] ||
      !svixHeaders['svix-timestamp'] ||
      !svixHeaders['svix-signature']
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required Svix webhook headers.',
      });
    }

    const webhook = new Webhook(
      process.env.RESEND_WEBHOOK_SECRET
    );

    let event;

    try {
      event = webhook.verify(
        payload,
        svixHeaders
      );
    } catch (verificationError) {
      console.error(
        '[ResendWebhook] Signature verification failed:',
        verificationError.message
      );

      return res.status(400).json({
        success: false,
        message:
          'Webhook verification failed.',
      });
    }

    const eventType =
      String(event?.type || '').trim();

    const emailAddress =
      getRecipientEmail(event);

    if (!eventType) {
      return res.status(400).json({
        success: false,
        message:
          'Webhook event type is missing.',
      });
    }

    if (!emailAddress) {
      console.warn(
        '[ResendWebhook] Event has no recipient email:',
        {
          eventId: event?.id || null,
          eventType,
        }
      );

      setWebhookAuditData(
        res,
        `Received Resend webhook event ${eventType} without a recipient email.`,
        {
          eventId: event?.id || null,
          eventType,
          recipientEmail: null,
          processed: false,
          reason: 'missing_recipient_email',
        }
      );

      // Return 200 so Resend does not retry an event that
      // cannot be processed because recipient data is absent.
      return res.status(200).json({
        success: true,
        processed: false,
        message:
          'Webhook received, but no recipient email was present.',
      });
    }

    let status = null;

    switch (eventType) {
      case 'email.delivered':
        status = 'delivered';
        break;

      case 'email.bounced':
        status = 'bounced';
        break;

      case 'email.delivery_delayed':
        status = 'delayed';
        break;

      case 'email.complained':
        status = 'complained';
        break;

      case 'email.opened':
        status = 'opened';
        break;

      case 'email.clicked':
        status = 'clicked';
        break;

      case 'email.sent':
        status = 'sent';
        break;

      default:
        console.log(
          `[ResendWebhook] Ignoring unsupported event: ${eventType}`
        );

        setWebhookAuditData(
          res,
          `Received unsupported Resend event ${eventType} for ${emailAddress}.`,
          {
            eventId: event?.id || null,
            eventType,
            recipientEmail: emailAddress,
            processed: false,
            reason: 'unsupported_event',
          }
        );

        return res.status(200).json({
          success: true,
          processed: false,
          message:
            `Webhook event ${eventType} was ignored.`,
        });
    }

    const emailLog =
      await updateEmailStatus({
        email: emailAddress,
        status,
        event,
      });

    console.log(
      `[ResendWebhook] ${eventType}: ${emailAddress} -> ${status}`
    );

    setWebhookAuditData(
      res,
      `Updated email delivery status for ${emailAddress} to ${status}.`,
      {
        eventId: event?.id || null,
        eventType,
        recipientEmail: emailAddress,
        emailStatus: status,
        processed: true,
        emailLogId: emailLog?.id || null,
      }
    );

    return res.status(200).json({
      success: true,
      processed: true,
      eventType,
      status,
    });
  } catch (error) {
    console.error(
      '[ResendWebhook] Processing failed:',
      error
    );

    const statusCode =
      error.statusCode ||
      error.status ||
      500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? 'Failed to process webhook.'
          : error.message,
    });
  }
};