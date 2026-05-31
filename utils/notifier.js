// C:\Users\HP\MediTrack\utils\notifier.js
const supabase = require('../configs/database');

/**
 * Sends a notification to a specific user.
 */
const sendNotification = async ({ userId, type, title, message, referenceId = null, referenceType = null }) => {
  try {
    const { error } = await supabase.from('notifications').insert([{
      user_id: userId,
      type: type, // e.g., 'appointment_status', 'approval', 'announcement'
      title: title,
      message: message,
      reference_id: referenceId,
      reference_type: referenceType
    }]);

    if (error) throw error;
    console.log(`🔔 Notification sent to user ${userId}`);

  } catch (error) {
    console.error('❌ Failed to send notification:', error.message);
  }
};

module.exports = { sendNotification };