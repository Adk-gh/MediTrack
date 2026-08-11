// backend/features/notifications/notifications.service.js
const supabase = require('../../configs/database');

const notificationsService = {
  async getInternalUserId(authUidOrInternalId) {
    if (!authUidOrInternalId) return null;

    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('uid', authUidOrInternalId)
      .maybeSingle();

    if (userProfile?.id) {
      return userProfile.id;
    }

    return authUidOrInternalId;
  },

  async createNotification(notificationData) {
    let userIdToUse = notificationData.userId;

    if (notificationData.userId) {
      userIdToUse = await this.getInternalUserId(notificationData.userId);
    }

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
    return data;
  },

  async notifyRoles(roles, notificationData) {
    const roleList = Array.isArray(roles) ? roles : [roles];

    const { data: targetUsers, error } = await supabase
      .from('users')
      .select('id, role')
      .in('role', roleList);

    if (error || !targetUsers || targetUsers.length === 0) return;

    const notifications = targetUsers.map((user) => ({
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      user_id: user.id,
      reference_id: notificationData.referenceId,
      reference_type: notificationData.referenceType,
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('[Notifications] Role bulk insert error:', insertError.message);
    }
  },

  // ── Notify Users for New Announcements ──
  async notifyAnnouncement(announcementData) {
    try {
      let targetDepts = [];
      const rawDept = announcementData.dept;

      if (Array.isArray(rawDept)) {
        targetDepts = rawDept;
      } else if (typeof rawDept === 'string') {
        try {
          const parsed = JSON.parse(rawDept);
          targetDepts = Array.isArray(parsed) ? parsed : [rawDept];
        } catch {
          targetDepts = [rawDept];
        }
      }

      const isAllDepts =
        targetDepts.length === 0 ||
        targetDepts.includes('All Departments') ||
        targetDepts.includes('All');

      let query = supabase.from('users').select('id, department');

      if (!isAllDepts) {
        query = query.in('department', targetDepts);
      }

      const { data: targetUsers, error } = await query;

      if (error || !targetUsers || targetUsers.length === 0) return;

      const notifications = targetUsers.map((user) => ({
        type: 'announcement',
        title: `📢 ${announcementData.title}`,
        message: announcementData.content?.substring(0, 140) || 'A new announcement has been posted.',
        user_id: user.id,
        reference_id: announcementData.id || null,
        reference_type: 'announcement',
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      // Chunk in batches of 200 to prevent oversized payloads
      const CHUNK_SIZE = 200;
      for (let i = 0; i < notifications.length; i += CHUNK_SIZE) {
        const chunk = notifications.slice(i, i + CHUNK_SIZE);
        const { error: insertError } = await supabase.from('notifications').insert(chunk);
        if (insertError) {
          console.error('[Notifications] Announcement insert error batch:', insertError.message);
        }
      }
    } catch (err) {
      console.error('[Notifications] notifyAnnouncement error:', err.message);
    }
  },

  async notifyAdmins(notificationData) {
    return this.notifyRoles(['sysadmin'], notificationData);
  },

  async getNotifications(userId, limit = 20) {
    const internalId = await this.getInternalUserId(userId);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', internalId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getUnreadCount(userId) {
    const internalId = await this.getInternalUserId(userId);
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', internalId)
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
    const internalId = await this.getInternalUserId(userId);
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', internalId)
      .eq('is_read', false);

    if (error) throw error;
  },

  async deleteNotification(notificationId, userId, isSysAdmin = false) {
    let query = supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (!isSysAdmin) {
      const internalId = await this.getInternalUserId(userId);
      query = query.eq('user_id', internalId);
    }

    const { data, error } = await query.select().maybeSingle();

    if (error) throw error;

    if (!data) {
      const notFoundError = new Error('Notification not found or unauthorized to delete');
      notFoundError.status = 404;
      throw notFoundError;
    }

    return data;
  },
};

module.exports = notificationsService;