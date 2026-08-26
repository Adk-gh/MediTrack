//C:\Users\HP\MediTrack\features\notifications\notifications.service.js

const supabase = require('../../configs/database');
const { getSystemConfig } = require('../../services/systemConfig.service');

const notificationsService = {

  // ============================================================
  // USER ID RESOLUTION
  // ============================================================

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


  // ============================================================
  // CREATE SINGLE NOTIFICATION
  // ============================================================

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
      reference_id: notificationData.referenceId || null,
      reference_type: notificationData.referenceType || null,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) {
      console.error(
        '[Notifications] Error creating notification:',
        error
      );
      throw error;
    }

    return data;
  },


async notifyRoles(roles, notificationData) {
  const roleList = Array.isArray(roles) ? roles : [roles];

  const normalizedRoles = roleList
    .filter(Boolean)
    .map(role => String(role).trim().toLowerCase());

  if (normalizedRoles.length === 0) {
    console.warn('[Notifications] notifyRoles called without roles.');
    return [];
  }

  console.log('[Notifications] Looking for users with roles:', normalizedRoles);

  const { data: allUsers, error } = await supabase
    .from('users')
    .select('id, uid, first_name, last_name, role');

  if (error) {
    console.error(
      '[Notifications] Failed to retrieve users:',
      error
    );
    return [];
  }

  console.log(
    '[Notifications] Available users:',
    (allUsers || []).map(user => ({
      id: user.id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role,
    }))
  );

  const targetUsers = (allUsers || []).filter(user => {
    const userRole = String(user.role || '')
      .trim()
      .toLowerCase();

    return normalizedRoles.includes(userRole);
  });

  console.log(
    '[Notifications] Target users:',
    targetUsers.map(user => ({
      id: user.id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role,
    }))
  );

  if (targetUsers.length === 0) {
    console.warn(
      '[Notifications] NO TARGET USERS FOUND for roles:',
      normalizedRoles
    );
    return [];
  }

  const notifications = targetUsers.map(user => ({
    type: notificationData.type,
    title: notificationData.title,
    message: notificationData.message,
    user_id: user.id,
    reference_id: notificationData.referenceId || null,
    reference_type: notificationData.referenceType || null,
    is_read: false,
    created_at: new Date().toISOString(),
  }));

  console.log(
    '[Notifications] Inserting notifications:',
    notifications
  );

  const { data, error: insertError } = await supabase
    .from('notifications')
    .insert(notifications)
    .select();

  if (insertError) {
    console.error(
      '[Notifications] FAILED TO INSERT NOTIFICATIONS:',
      insertError
    );

    return [];
  }

  console.log(
    '[Notifications] SUCCESSFULLY CREATED:',
    data
  );

  return data || [];
},

  // ============================================================
  // NOTIFY CLINIC STAFF
  // ============================================================

  async notifyClinicStaff(notificationData) {
    try {
      const config = await getSystemConfig();

      const clinicRoles = Array.isArray(config?.clinic_roles)
        ? config.clinic_roles
        : [];

      const adminRoles = Array.isArray(config?.admin_roles)
        ? config.admin_roles
        : [];

      /*
       * Same safety-net roles used by records.route.js.
       *
       * Dynamic roles come from System Configuration.
       */
      const roles = [
        ...clinicRoles,
        ...adminRoles,
        'sysadmin',
        'doctor',
        'dentist',
        'nurse',
      ];

      // Remove duplicates case-insensitively
      const uniqueRoles = [
        ...new Map(
          roles
            .filter(Boolean)
            .map(role => [
              String(role).trim().toLowerCase(),
              role,
            ])
        ).values()
      ];

      return await this.notifyRoles(
        uniqueRoles,
        notificationData
      );

    } catch (error) {
      console.error(
        '[Notifications] notifyClinicStaff error:',
        error.message
      );

      /*
       * Notification failure should normally NOT prevent the
       * actual certificate/report request from being created.
       */
      return [];
    }
  },

// ============================================================
// RECORD / CERTIFICATE / REPORT REQUEST
// ============================================================

async notifyRecordRequest(requestData) {
  const {
    requestId,
    requestType,
    recordType,
    patientName,
    message,
  } = requestData;

  const normalizedRecordType = String(
    recordType || 'medical'
  )
    .trim()
    .toLowerCase();

  const normalizedRequestType = String(
    requestType || ''
  )
    .trim()
    .toLowerCase();

  let targetRoles;
  let title;
  let documentName;

  // ──────────────────────────────────────────────────────────
  // MEDICAL → DOCTOR
  // ──────────────────────────────────────────────────────────

  if (normalizedRecordType === 'medical') {
    targetRoles = ['doctor'];

    title = 'New Medical Certificate Request';

    documentName = 'medical certificate';
  }

  // ──────────────────────────────────────────────────────────
  // DENTAL → DENTIST
  // ──────────────────────────────────────────────────────────

  else if (normalizedRecordType === 'dental') {
    targetRoles = ['dentist'];

    title = 'New Dental Report Request';

    documentName = 'dental report';
  }

  // ──────────────────────────────────────────────────────────
  // FALLBACK
  // ──────────────────────────────────────────────────────────

  else {
    targetRoles = ['doctor', 'dentist'];

    title = 'New Record Request';

    documentName = 'medical/dental document';
  }

  const notificationMessage =
    message ||
    `${patientName || 'A patient'} requested a ${documentName}.`;

  console.log(
    '[Notifications] notifyRecordRequest:',
    {
      requestId,
      recordType: normalizedRecordType,
      requestType: normalizedRequestType,
      targetRoles,
      patientName,
    }
  );

  return await this.notifyRoles(
    targetRoles,
    {
      type:
        normalizedRequestType ||
        'record_request',

      title,

      message: notificationMessage,

      referenceId: requestId || null,

      referenceType: 'record_request',
    }
  );
},


  // ============================================================
  // ANNOUNCEMENTS
  // ============================================================

  async notifyAnnouncement(announcementData) {
    try {
      let targetDepts = [];
      const rawDept = announcementData.dept;

      if (Array.isArray(rawDept)) {
        targetDepts = rawDept;
      } else if (typeof rawDept === 'string') {
        try {
          const parsed = JSON.parse(rawDept);
          targetDepts = Array.isArray(parsed)
            ? parsed
            : [rawDept];
        } catch {
          targetDepts = [rawDept];
        }
      }

      const isAllDepts =
        targetDepts.length === 0 ||
        targetDepts.includes('All Departments') ||
        targetDepts.includes('All');

      let query = supabase
        .from('users')
        .select('id, department');

      if (!isAllDepts) {
        query = query.in('department', targetDepts);
      }

      const { data: targetUsers, error } = await query;

      if (
        error ||
        !targetUsers ||
        targetUsers.length === 0
      ) {
        return;
      }

      const notifications = targetUsers.map(user => ({
        type: 'announcement',
        title: announcementData.title,
        message:
          announcementData.content?.substring(0, 140) ||
          'A new announcement has been posted.',
        user_id: user.id,
        reference_id: announcementData.id || null,
        reference_type: 'announcement',
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      const CHUNK_SIZE = 200;

      for (
        let i = 0;
        i < notifications.length;
        i += CHUNK_SIZE
      ) {
        const chunk = notifications.slice(
          i,
          i + CHUNK_SIZE
        );

        const { error: insertError } =
          await supabase
            .from('notifications')
            .insert(chunk);

        if (insertError) {
          console.error(
            '[Notifications] Announcement insert error batch:',
            insertError.message
          );
        }
      }

    } catch (err) {
      console.error(
        '[Notifications] notifyAnnouncement error:',
        err.message
      );
    }
  },


  // ============================================================
  // ADMIN NOTIFICATIONS
  // ============================================================

  async notifyAdmins(notificationData) {
    return this.notifyRoles(
      ['sysadmin'],
      notificationData
    );
  },


  // ============================================================
  // GET NOTIFICATIONS
  // ============================================================

  async getNotifications(userId, limit = 20) {
    const internalId =
      await this.getInternalUserId(userId);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', internalId)
      .order('created_at', {
        ascending: false
      })
      .limit(limit);

    if (error) throw error;

    return data;
  },


  // ============================================================
  // UNREAD COUNT
  // ============================================================

  async getUnreadCount(userId) {
    const internalId =
      await this.getInternalUserId(userId);

    const { count, error } = await supabase
      .from('notifications')
      .select('*', {
        count: 'exact',
        head: true
      })
      .eq('user_id', internalId)
      .eq('is_read', false);

    if (error) throw error;

    return count || 0;
  },


  // ============================================================
  // MARK SINGLE NOTIFICATION AS READ
  // ============================================================

  async markAsRead(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true
      })
      .eq('id', notificationId);

    if (error) throw error;
  },


  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  async markAllAsRead(userId) {
    const internalId =
      await this.getInternalUserId(userId);

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true
      })
      .eq('user_id', internalId)
      .eq('is_read', false);

    if (error) throw error;
  },


  // ============================================================
  // DELETE NOTIFICATION
  // ============================================================

  async deleteNotification(
    notificationId,
    userId,
    isSysAdmin = false
  ) {
    let query = supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (!isSysAdmin) {
      const internalId =
        await this.getInternalUserId(userId);

      query = query.eq(
        'user_id',
        internalId
      );
    }

    const { data, error } =
      await query.select().maybeSingle();

    if (error) throw error;

    if (!data) {
      const notFoundError = new Error(
        'Notification not found or unauthorized to delete'
      );

      notFoundError.status = 404;

      throw notFoundError;
    }

    return data;
  },
};

module.exports = notificationsService;