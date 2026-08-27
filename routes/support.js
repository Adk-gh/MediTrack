// routes/support.route.js

const express = require('express');
const multer = require('multer');
const { sendEmail } = require('../services/email.service'); // Adjust path if necessary

const router = express.Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

// ============================================================
// MULTER CONFIGURATION
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },

  fileFilter: (req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      const error = new Error(
        'Invalid file type. Only JPG, PNG, WEBP, and GIF images are allowed.'
      );

      error.statusCode = 400;
      error.code = 'INVALID_FILE_TYPE';

      return callback(error);
    }

    callback(null, true);
  },
});

// ============================================================
// MULTER WRAPPER
// ============================================================

const uploadAttachment = (req, res, next) => {
  upload.single('attachment')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image is too large. Maximum file size is 5 MB.',
        });
      }

      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Only one attachment is allowed.',
        });
      }

      return res.status(400).json({
        success: false,
        message: `Attachment upload failed: ${error.message}`,
      });
    }

    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Invalid attachment.',
    });
  });
};

// ============================================================
// HEALTH CHECK
// GET /api/support/email-status
// ============================================================

router.get('/email-status', async (req, res) => {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured.');
    }

    return res.status(200).json({
      success: true,
      message: 'Support email service is connected via Resend.',
      sender: process.env.MAIL_FROM || 'MediTrack <noreply@meditrackdlsp.online>',
      recipient: process.env.SUPPORT_EMAIL || 'Support Desk',
    });
  } catch (error) {
    console.error('[Support] Email verification failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Support email service is not configured correctly.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
});

// ============================================================
// SEND SUPPORT / FEEDBACK EMAIL
// POST /api/support/send-email
// ============================================================

router.post(
  '/send-email',
  uploadAttachment,
  async (req, res) => {
    try {
      const type = String(req.body?.type || '')
        .trim()
        .toLowerCase();

      const email = String(req.body?.email || '').trim();
      const message = String(req.body?.message || '').trim();

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required.',
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message is required.',
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.',
        });
      }

      if (message.length > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Message must not exceed 10,000 characters.',
        });
      }

      const emailType = type === 'feedback' ? 'feedback' : 'contact';

      const recipientEmail = (
        process.env.SUPPORT_EMAIL ||
        'meditrack93@gmail.com'
      ).trim();

      const subject =
        emailType === 'feedback'
          ? `New MediTrack Feedback from ${email}`
          : `MediTrack Support Request from ${email}`;

      const submittedAt = new Date().toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'full',
        timeStyle: 'medium',
      });

      const textContent = [
        `You have received a new MediTrack ${emailType} message.`,
        '',
        `Sender Email: ${email}`,
        `Submitted At: ${submittedAt}`,
        '',
        'Message:',
        message,
        '',
        req.file
          ? `Attachment: ${req.file.originalname}`
          : 'Attachment: None',
      ].join('\n');

      const htmlContent = `
        <div
          style="
            max-width: 640px;
            margin: 0 auto;
            padding: 24px;
            font-family: Arial, sans-serif;
            color: #1f2937;
          "
        >
          <div
            style="
              padding: 20px;
              border: 1px solid #dce7e3;
              border-radius: 14px;
              background: #ffffff;
            "
          >
            <h2
              style="
                margin: 0 0 18px;
                color: #355b52;
              "
            >
              ${
                emailType === 'feedback'
                  ? 'New MediTrack Feedback'
                  : 'New MediTrack Support Request'
              }
            </h2>

            <p>
              <strong>Sender:</strong>
              <a href="mailto:${escapeHtml(email)}">
                ${escapeHtml(email)}
              </a>
            </p>

            <p>
              <strong>Submitted:</strong>
              ${escapeHtml(submittedAt)}
            </p>

            <div
              style="
                margin-top: 18px;
                padding: 16px;
                border-radius: 10px;
                background: #f4f8f6;
                white-space: pre-wrap;
                line-height: 1.6;
              "
            >${escapeHtml(message)}</div>

            <p style="margin-top: 18px; color: #64748b;">
              ${
                req.file
                  ? `Attachment: ${escapeHtml(
                      req.file.originalname
                    )}`
                  : 'No attachment was provided.'
              }
            </p>
          </div>
        </div>
      `;

      // Format attachment for Resend
      const resendAttachments = req.file
        ? [
            {
              filename: req.file.originalname,
              content: req.file.buffer, // Buffer straight from Multer
            },
          ]
        : undefined;

      // Send the email via Resend
      const response = await sendEmail({
        to: recipientEmail,
        subject,
        text: textContent,
        html: htmlContent,
        reply_to: email, // Directly reply to the sender
        attachments: resendAttachments,
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Resend API failed');
      }

      return res.status(200).json({
        success: true,
        message:
          emailType === 'feedback'
            ? 'Feedback submitted successfully.'
            : 'Support message sent successfully.',
      });
    } catch (error) {
      console.error('[Support] Email sending failed:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to send email. Please try again later.',
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined,
      });
    }
  }
);

// ============================================================
// HTML ESCAPING
// ============================================================

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

module.exports = router;