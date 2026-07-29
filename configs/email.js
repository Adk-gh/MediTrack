// C:\Users\HP\MediTrack\configs\email.js
const { Resend } = require('resend');

// Initialize Resend with API key from environment
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Fallback to nodemailer if no Resend key (for local development)
let transporter = null;
if (!resend) {
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: process.env.MAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
  });
}

// Verify connection on startup
const verifyConnection = async () => {
  if (resend) {
    console.log('>>> [Email] Using Resend for emails');
    return;
  }
  if (transporter) {
    try {
      await transporter.verify();
      console.log('>>> [Email] SMTP connection verified');
    } catch (error) {
      console.error('>>> [Email] SMTP connection error:', error.message);
    }
  }
};

// Send email function
const sendEmail = async ({ to, subject, html }) => {
  // Use Resend if available
  if (resend) {
    try {
      const data = await resend.emails.send({
        from: process.env.MAIL_FROM_ADDRESS || 'MediTrack <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: html,
      });
      console.log('>>> [Email] Sent via Resend:', data);
      const messageId = data?.data?.id || data?.id;
      return { success: true, messageId: messageId };
    } catch (error) {
      console.error('>>> [Email] Resend error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Fallback to nodemailer
  if (!transporter) {
    console.error('>>> [Email] No email service configured');
    return { success: false, error: 'No email service configured' };
  }

  const mailOptions = {
    from: `"${process.env.MAIL_FROM_NAME || 'MediTrack'}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
  };

  const timeoutMs = 15000;

  try {
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email send timeout')), timeoutMs)
      )
    ]);
    console.log('>>> [Email] Sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('>>> [Email] Send error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  transporter: resend, // For compatibility
  sendEmail,
  verifyConnection,
};
