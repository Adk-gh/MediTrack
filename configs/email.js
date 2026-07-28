// C:\Users\HP\MediTrack\configs\email.js
const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: process.env.MAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify connection on startup (optional)
const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log('>>> [Email] SMTP connection verified');
  } catch (error) {
    console.error('>>> [Email] SMTP connection error:', error.message);
  }
};

// Send email function
const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"${process.env.MAIL_FROM_NAME || 'MediTrack'}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
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
