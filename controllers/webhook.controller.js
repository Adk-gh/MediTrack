//C:\Users\HP\MediTrack\controllers\webhook.controller.js
const { Webhook } = require('svix'); // Resend uses Svix to verify webhook signatures

exports.resendWebhook = async (req, res) => {
  try {
    const payload = req.body.toString();
    const headers = req.headers;

    // Verify the webhook is actually from Resend (security best practice)
    const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);
    const event = wh.verify(payload, headers);

    // Check which event just happened
    if (event.type === 'email.delivered') {
      const emailId = event.data.email_id;
      const recipient = event.data.to[0];

      console.log(`✅ [Resend] Email ${emailId} successfully delivered to ${recipient}`);

      // Here you could update your 'users' table or an 'email_logs' table
      // in Supabase to mark the exact timestamp of delivery.
    }

    if (event.type === 'email.bounced') {
      console.error(`❌ [Resend] Email bounced for ${event.data.to[0]}`);
      // Handle the bounce (e.g., flag the user account, notify an admin)
    }

    // Always return a 200 OK so Resend knows you received the event
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).json({ success: false, message: 'Webhook verification failed' });
  }
};