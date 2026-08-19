const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Configure the email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or 'outlook', 'yahoo', etc.
  auth: {
    user: process.env.MAIL_USERNAME, // e.g., 'yourclinic@gmail.com'
    pass: process.env.MAIL_PASSWORD, // Use an App Password, not your real password
  },
});

router.post('/send-email', async (req, res) => {
  // 1. Extract the exact email the user typed in the frontend
  const { type, email, message } = req.body;

  const subject = type === 'contact'
    ? `Support Request from ${email}`
    : `New Feedback from ${email}`;

  const mailOptions = {
    from: process.env.MAIL_USERNAME,
    to: process.env.MAIL_USERNAME,
    replyTo: email,
    subject: subject,
    // 2. Display the user's email right here in the body!
    text: `You have received a new ${type} message.\n\nSender Email: ${email}\n\nMessage:\n${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
});

module.exports = router;