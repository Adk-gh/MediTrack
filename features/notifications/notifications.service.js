// C:\Users\HP\MediTrack\features\notifications\notifications.service.js
const supabase = require('../../configs/database');

const notificationsService = {
  async createNotification(notificationData) {
    // notificationData.userId is the Supabase Auth UUID (from localStorage user.uid)
    // We need to look up the internal users.id to satisfy the foreign key constraint
    let userIdToUse = notificationData.userId;

    // Try to find internal user ID from the Supabase Auth UUID
    if (notificationData.userId) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('uid', notificationData.userId)
        .single();

      if (userProfile?.id) {
        console.log('[Notifications] Found internal user id:', userProfile.id, 'from auth uid:', notificationData.userId);
        userIdToUse = userProfile.id;
      } else {
        console.warn('[Notifications] Could not find internal user for uid:', notificationData.userId);
      }
    }

    console.log('[Notifications] Creating notification:', {
      type: notificationData.type,
      title: notificationData.title,
      userId: userIdToUse, // Now using internal ID
      referenceId: notificationData.referenceId,
    });

    const notification = {
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      user_id: userIdToUse,
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

    if (error) {
      console.error('[Notifications] Error creating notification:', error);
      throw error;
    }
    console.log('[Notifications] Notification created successfully:', data);
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

  // Ownership-scoped delete: only removes the row if it belongs to userId.
  // Throws a NOT_FOUND-style error if the notification doesn't exist or
  // isn't owned by this user, so the controller can respond appropriately.
  async deleteNotification(notificationId, userId) {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const notFoundError = new Error('Notification not found or not owned by this user');
      notFoundError.status = 404;
      throw notFoundError;
    }

    return data;
  },

  async notifyAdmins(notificationData) {
    // Get admin users — select both id (internal, used as notifications.user_id
    // per the FK constraint) and uid (kept here only in case other callers
    // start needing it for logging).
    const { data: adminUsers, error } = await supabase
      .from('users')
      .select('id, uid')
      .eq('role', 'admin');

    if (error || !adminUsers) return;

    // Create notifications for each admin. FIX: notifications.user_id
    // references users.id (internal), not users.uid (auth id) — the
    // previous version sent admin.uid here, which either violated the FK
    // or pointed at the wrong row.
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