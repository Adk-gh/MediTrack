// C:\Users\HP\MediTrack\configs\email.js
const nodemailer = require('nodemailer');

// Check for SendGrid API key first
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

// Initialize SendGrid mail service
let transporter = null;

if (SENDGRID_API_KEY) {
  // Use SendGrid
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(SENDGRID_API_KEY);

  transporter = {
    sendMail: async (mailOptions) => {
      const msg = {
        to: mailOptions.to,
        from: process.env.MAIL_FROM_ADDRESS || 'MediTrack <meditrack93@gmail.com>',
        subject: mailOptions.subject,
        html: mailOptions.html,
      };
      await sgMail.send(msg);
      return { messageId: 'sent' };
    }
  };
} else {
  // Fallback to regular SMTP
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
  try {
    if (SENDGRID_API_KEY) {
      console.log('>>> [Email] Using SendGrid for emails');
    } else {
      await transporter.verify();
      console.log('>>> [Email] SMTP connection verified');
    }
  } catch (error) {
    console.error('>>> [Email] Connection error:', error.message);
  }
};

// Send email function
const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"${process.env.MAIL_FROM_NAME || 'MediTrack'}" <${process.env.MAIL_FROM_ADDRESS || 'meditrack93@gmail.com'}>`,
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
  transporter,
  sendEmail,
  verifyConnection,
};
