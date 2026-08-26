// features/archives/archives.service.js
const supabase = require('../../configs/database');
const supabaseAuth = require('../../configs/database');
const notificationsService = require('../notifications/notifications.service');

const ARCHIVE_TABLE = 'archives';

// Archive types
const ARCHIVE_TYPES = {
  RECORD: 'record',
  ANNOUNCEMENT: 'announcement',
  USER: 'user',
  CONSULTATION: 'consultation',
  APPOINTMENT: 'appointment',
  EXAMINATION: 'examination',
  AUDIT_LOG: 'audit_log'
};

exports.moveToArchives = async ({ type, originalId, data, deletedBy }) => {
  const archiveEntry = {
    type,
    original_id: originalId,
    data: JSON.stringify(data),
    deleted_by: deletedBy,
    archived_at: new Date().toISOString(),
    permanent_delete_at: new Date(
      Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)
    ).toISOString(),
    is_permanently_deleted: false
  };

  const { data: result, error } = await supabase
    .from(ARCHIVE_TABLE)
    .insert(archiveEntry)
    .select()
    .single();

  if (error) throw error;

  // Create archive notification
  try {
    await notificationsService.notifyAdmins({
      type: 'archive',
      title: 'Item Archived',
      message: `${type} with ID ${originalId} was archived by ${deletedBy || 'system'}.`,
      referenceId: originalId,
      referenceType: type
    });
  } catch (notificationError) {
    console.error(
      '[Archives] Failed to create archive notification:',
      notificationError.message
    );
  }

  return result;
};

// Get all archives with filters
exports.getArchives = async ({ type, search, page = 1, limit = 20 }) => {
  let query = supabase
    .from(ARCHIVE_TABLE)
    .select('*', { count: 'exact' })
    .eq('is_permanently_deleted', false)
    .order('archived_at', { ascending: false });

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  if (search) {
    query = query.or(`data.ilike.%${search}%,original_id.ilike.%${search}%`);
  }

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;
  return { data, count, page, limit };
};

// Get archive by ID
exports.getArchiveById = async (id) => {
  const { data, error } = await supabase
    .from(ARCHIVE_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

// ============================================================
// RESTORE FROM ARCHIVES
// Restores an item and notifies the specific user
// ============================================================
exports.restoreFromArchives = async (id, tableName) => {
  if (!tableName) {
    throw new Error('Table name is required');
  }

  const idColumn = tableName === 'users' ? 'uid' : 'id';

  // 1. Fetch the record BEFORE restoring so we know who to notify
  const { data: existingRecord, error: fetchError } = await supabase
    .from(tableName)
    .select('*')
    .eq(idColumn, id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existingRecord) throw new Error(`Record not found in ${tableName}`);

  // 2. Perform the Restore
  const { error: updateError } = await supabase
    .from(tableName)
    .update({
      is_archived: false,
      deleted_by: null,
      updated_at: new Date().toISOString()
    })
    .eq(idColumn, id);

  if (updateError) {
    throw updateError;
  }

  // 3. Dispatch dynamic notification to the patient/user
  try {
    let targetUserId = null;
    let notifTitle = '';
    let notifMessage = '';
    let notifType = 'restored';

    // Figure out exactly what was restored and who owns it
    if (tableName === 'users') {
      targetUserId = existingRecord.uid; // For users, the owner IS the record
      notifTitle = 'Account Restored';
      notifMessage = 'Your account has been successfully restored from the archives by the administrator.';
      notifType = 'user_restored';
    }
    else if (tableName === 'appointments') {
      targetUserId = existingRecord.user_id;
      notifTitle = 'Appointment Restored';
      notifMessage = 'Your previously archived appointment has been restored by the clinic staff.';
      notifType = 'appointment_restored';
    }
    else if (tableName === 'medical_records' || tableName === 'dental_records') {
      targetUserId = existingRecord.user_id;
      const docType = tableName === 'medical_records' ? 'medical' : 'dental';
      notifTitle = 'Record Restored';
      notifMessage = `Your ${docType} record has been restored from the archives.`;
      notifType = 'record_restored';
    }

    // Send the notification if we found a valid user to send it to
    if (targetUserId) {
      await notificationsService.createNotification({
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        userId: targetUserId,
        referenceId: id,
        referenceType: tableName
      });
      console.log(`[Archives] Successfully sent restore notification for ${tableName} to user ${targetUserId}`);
    }

  } catch (notifyErr) {
    console.error('[Archives] Failed to send restore notification:', notifyErr.message);
  }

  return { success: true, tableName, id };
};

// ============================================================
// PERMANENTLY DELETE FROM ARCHIVES
// Notifies users if their personal records are wiped
// ============================================================
exports.permanentDelete = async (id, tableName) => {
  if (!tableName) {
    throw new Error('Table name is required');
  }

  const idColumn = tableName === 'users' ? 'uid' : 'id';

  // 1. Find the archive record
  const { data: archiveRecord } = await supabase
    .from(ARCHIVE_TABLE)
    .select('*')
    .or(`id.eq.${id},original_id.eq.${id}`)
    .maybeSingle();

  let targetId = id;
  if (archiveRecord && archiveRecord.original_id) {
    targetId = archiveRecord.original_id;
  }

  // 2. FETCH RECORD BEFORE DELETION (to get the user_id for notifications)
  let ownerUserId = null;
  const userOwnedTables = ['appointments', 'medical_records', 'dental_records', 'consultations'];

  if (userOwnedTables.includes(tableName)) {
    const { data: existingRecord } = await supabase
      .from(tableName)
      .select('user_id')
      .eq(idColumn, targetId)
      .maybeSingle();

    if (existingRecord && existingRecord.user_id) {
      ownerUserId = existingRecord.user_id;
    }
  }

  // 3. FOR USERS: Delete from Supabase Auth FIRST
  if (tableName === 'users') {
    console.log(`>>> [Archives] Attempting Auth deletion for UID: ${targetId}`);
    const { error: authError } = await supabase.auth.admin.deleteUser(targetId);

    if (authError) {
      const isNotFoundError = authError.message.toLowerCase().includes('not found') || authError.status === 404;
      if (isNotFoundError) {
        console.warn(`>>> [Archives] User ${targetId} already missing from Auth. Proceeding with DB cleanup.`);
      } else {
        console.error('>>> [Archives] Failed to delete user from Supabase Auth:', authError.message);
        throw new Error(`Cannot permanently delete user: Auth deletion failed - ${authError.message}`);
      }
    }
  }

  // 4. Delete from the original table
  const { error: dbError } = await supabase
    .from(tableName)
    .delete()
    .eq(idColumn, targetId);

  if (dbError) throw dbError;

  // 5. Clean up the row in the ARCHIVE_TABLE
  if (archiveRecord) {
    const { error: archiveCleanupError } = await supabase
      .from(ARCHIVE_TABLE)
      .delete()
      .eq('id', archiveRecord.id);

    if (archiveCleanupError) {
      console.warn(`>>> [Archives] Warning: Failed to clean up archives table`, archiveCleanupError.message);
    }
  }

  // 6. DISPATCH NOTIFICATION (Only for patient-owned records)
  if (ownerUserId && tableName !== 'users') {
    try {
      let notifTitle = 'Data Permanently Erased';
      let notifMessage = `Your ${tableName.replace('_', ' ')} data has been permanently deleted from the system.`;

      if (tableName === 'appointments') {
        notifTitle = 'Appointment Permanently Erased';
        notifMessage = 'An archived appointment record of yours has been permanently erased by the clinic administrator.';
      } else if (tableName === 'medical_records' || tableName === 'dental_records') {
        const docType = tableName === 'medical_records' ? 'medical' : 'dental';
        notifTitle = 'Record Permanently Erased';
        notifMessage = `Your archived ${docType} record has been permanently erased from the system due to data retention policies.`;
      }

      await notificationsService.createNotification({
        type: 'permanent_deletion',
        title: notifTitle,
        message: notifMessage,
        userId: ownerUserId,

        // IMPORTANT: We leave referenceId null so the frontend doesn't try to link
        // to a record that no longer exists!
        referenceId: null,
        referenceType: null
      });

      console.log(`[Archives] Sent permanent deletion notification to user ${ownerUserId}`);
    } catch (notifyErr) {
      console.error('[Archives] Failed to send permanent deletion notification:', notifyErr.message);
    }
  }

  return { id: targetId, tableName, success: true };
};

// Clean up old archives (older than 2 years)
exports.cleanupOldArchives = async () => {
  const twoYearsAgo = new Date(Date.now() - (2 * 365 * 24 * 60 * 60 * 1000)).toISOString();

  const { data, error } = await supabase
    .from(ARCHIVE_TABLE)
    .delete()
    .eq('is_permanently_deleted', false)
    .lt('permanent_delete_at', twoYearsAgo)
    .select();

  if (error) throw error;
  return { deleted: data?.length || 0 };
};

// Get archive statistics
exports.getArchiveStats = async () => {
  const { data, error } = await supabase
    .from(ARCHIVE_TABLE)
    .select('type')
    .eq('is_permanently_deleted', false);

  if (error) throw error;

  const stats = {
    total: data?.length || 0,
    records: 0,
    announcements: 0,
    users: 0,
    consultations: 0,
    appointments: 0,
    examinations: 0,
    audit_logs: 0
  };

  data?.forEach(item => {
    if (stats.hasOwnProperty(item.type)) {
      stats[item.type]++;
    }
  });

  return stats;
};

module.exports = exports;