// C:\Users\HP\MediTrack\features/notifications/notifications.service.js
const supabase = require('../../configs/database');

const notificationsService = {
  async createNotification(notificationData) {
    const notification = {
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      user_id: notificationData.userId,
      reference_id: notificationData.referenceId,
      reference_type: notificationData.referenceType,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getNotifications(userId, limit = 20) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  async markAsRead(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  async deleteNotification(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  },

  async notifyAdmins(notificationData) {
    // Get admin users
    const { data: adminUsers, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (error || !adminUsers) return;

    // Create notifications for each admin
    const notifications = adminUsers.map(admin => ({
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      user_id: admin.id,
      reference_id: notificationData.referenceId,
      reference_type: notificationData.referenceType,
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('>>> [Notifications] Bulk insert error:', insertError);
    }
  },
};

module.exports = notificationsService;