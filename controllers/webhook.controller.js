// controllers/webhook.controller.js
const { Webhook } = require('svix');
const supabase = require('../configs/database');

exports.handleResendWebhook = async (req, res) => {
  try {
    const payload = JSON.stringify(req.body);
    const headers = req.headers;

    // Create a new Svix instance using your Render environment variable
    const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);

    // Verify the payload using Svix
    const event = wh.verify(payload, {
      "svix-id": headers["svix-id"],
      "svix-timestamp": headers["svix-timestamp"],
      "svix-signature": headers["svix-signature"],
    });

    const emailAddress = event.data.to[0];

    // Handle the specific events we checked in the dashboard
    if (event.type === 'email.bounced') {
      console.log(`[Webhook] Email bounced for: ${emailAddress}`);

      // Update Supabase to mark this email as bounced
      await supabase
        .from('email_logs') // Use your actual table name tracking emails or users
        .upsert({ email: emailAddress, status: 'bounced', updated_at: new Date() }, { onConflict: 'email' });

    } else if (event.type === 'email.delivered') {
      console.log(`[Webhook] Email delivered to: ${emailAddress}`);

      await supabase
        .from('email_logs')
        .upsert({ email: emailAddress, status: 'delivered', updated_at: new Date() }, { onConflict: 'email' });
    }

    // Always respond with 200 OK so Resend knows you received it
    res.status(200).json({ success: true });

  } catch (err) {
    console.error('[Webhook] Verification failed:', err.message);
    res.status(400).json({ success: false, message: 'Webhook verification failed' });
  }
};