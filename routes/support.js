// routes/support.route.js

const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');

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
// This makes Multer errors reach our own JSON response.
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
// MAIL CONFIGURATION
// ============================================================

const createTransporter = () => {
  const mailUsername = process.env.MAIL_USERNAME;
  const mailPassword = process.env.MAIL_PASSWORD;

  if (!mailUsername) {
    throw new Error('MAIL_USERNAME is not configured.');
  }

  if (!mailPassword) {
    throw new Error('MAIL_PASSWORD is not configured.');
  }

  return nodemailer.createTransport({
    service: 'gmail',

    auth: {
      user: mailUsername.trim(),

      // Gmail app passwords are sometimes copied with spaces.
      pass: mailPassword.replace(/\s+/g, ''),
    },

    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });
};

// ============================================================
// HEALTH CHECK
// GET /api/support/email-status
// ============================================================

router.get('/email-status', async (req, res) => {
  try {
    const transporter = createTransporter();

    await transporter.verify();

    return res.status(200).json({
      success: true,
      message: 'Support email service is connected.',
      sender: process.env.MAIL_USERNAME,
      recipient:
        process.env.SUPPORT_EMAIL || process.env.MAIL_USERNAME,
    });
  } catch (error) {
    console.error('[Support] Email verification failed:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });

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

      const emailType =
        type === 'feedback' ? 'feedback' : 'contact';

      const senderEmail = process.env.MAIL_USERNAME?.trim();

      const recipientEmail = (
        process.env.SUPPORT_EMAIL ||
        process.env.MAIL_USERNAME ||
        ''
      ).trim();

      if (!senderEmail) {
        throw new Error('MAIL_USERNAME is missing.');
      }

      if (!recipientEmail) {
        throw new Error(
          'SUPPORT_EMAIL and MAIL_USERNAME are both missing.'
        );
      }

      const transporter = createTransporter();

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

      const mailOptions = {
        from: {
          name: 'MediTrack Support',
          address: senderEmail,
        },

        to: recipientEmail,

        // Replies go directly to the student/user.
        replyTo: email,

        subject,

        text: textContent,

        html: htmlContent,

        attachments: req.file
          ? [
              {
                filename: req.file.originalname,
                content: req.file.buffer,
                contentType: req.file.mimetype,
              },
            ]
          : [],
      };

      const info = await transporter.sendMail(mailOptions);

      console.log('[Support] Email sent successfully:', {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        sender: senderEmail,
        recipient: recipientEmail,
        replyTo: email,
        type: emailType,
        attachment: req.file?.originalname || null,
      });

      return res.status(200).json({
        success: true,
        message:
          emailType === 'feedback'
            ? 'Feedback submitted successfully.'
            : 'Support message sent successfully.',
      });
    } catch (error) {
      console.error('[Support] Email sending failed:', {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack,
      });

      let clientMessage = 'Failed to send email.';

      if (error.code === 'EAUTH') {
        clientMessage =
          'The support email account could not authenticate. Check the Gmail address and App Password.';
      } else if (
        error.code === 'ECONNECTION' ||
        error.code === 'ETIMEDOUT'
      ) {
        clientMessage =
          'The email server could not be reached. Please try again.';
      } else if (
        error.message?.includes('MAIL_USERNAME') ||
        error.message?.includes('MAIL_PASSWORD') ||
        error.message?.includes('SUPPORT_EMAIL')
      ) {
        clientMessage =
          'The support email service is not configured.';
      }

      return res.status(500).json({
        success: false,
        message: clientMessage,

        // Only expose technical information locally.
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