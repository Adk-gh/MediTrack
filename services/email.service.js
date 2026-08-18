//C:\Users\HP\MediTrack\services\email.service.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.MAIL_FROM ||
  'MediTrack <noreply@meditrackdlsp.online>';

const sendEmail = async ({
  to,
  subject,
  html,
  text,
}) => {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('[Resend] Email error:', error);

      return {
        success: false,
        error,
      };
    }

    console.log('[Resend] Email sent:', data);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('[Resend] Exception:', error);

    return {
      success: false,
      error,
    };
  }
};

module.exports = {
  sendEmail,
};