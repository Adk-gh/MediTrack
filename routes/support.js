const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Multer configuration
// ─────────────────────────────────────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only JPG, PNG, WEBP, and GIF images are allowed.'
        )
      );
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Configure email transporter
// ─────────────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: 'gmail',

  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Send Support / Feedback Email
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/send-email',
  upload.single('attachment'),
  async (req, res) => {
    try {
      // Extract form data
      const { type, email, message } = req.body;

      // Basic validation
      if (!email || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required.',
        });
      }

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message is required.',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.',
        });
      }

      // Only allow the expected types
      const emailType =
        type === 'feedback' ? 'feedback' : 'contact';

      const subject =
        emailType === 'contact'
          ? `Support Request from ${email}`
          : `New Feedback from ${email}`;

      // ───────────────────────────────────────────────────────────────────────
      // Email options
      // ───────────────────────────────────────────────────────────────────────

      const mailOptions = {
        from: process.env.MAIL_USERNAME,

        to: process.env.MAIL_USERNAME,

        // Allows clinic staff to directly reply to the student's email
        replyTo: email.trim(),

        subject,

        text: `You have received a new ${emailType} message.

Sender Email: ${email}

Message:
${message}

${
  req.file
    ? `Attachment:
${req.file.originalname}`
    : 'No attachment was provided.'
}
`,

        // Attach image if one was uploaded
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

      // ───────────────────────────────────────────────────────────────────────
      // Send email
      // ───────────────────────────────────────────────────────────────────────

      await transporter.sendMail(mailOptions);

      console.log(
        `[Support] ${emailType} email sent from ${email}${
          req.file ? ` with attachment: ${req.file.originalname}` : ''
        }`
      );

      return res.status(200).json({
        success: true,
        message: 'Email sent successfully.',
      });
    } catch (error) {
      console.error('[Support] Error sending email:', error);

      // Multer file-size error
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Image is too large. Maximum file size is 5 MB.',
          });
        }

        return res.status(400).json({
          success: false,
          message: 'There was a problem uploading the image.',
        });
      }

      // Invalid image type
      if (
        error.message &&
        error.message.includes('Invalid file type')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to send email.',
      });
    }
  }
);

module.exports = router;