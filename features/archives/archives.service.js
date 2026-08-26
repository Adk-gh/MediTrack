// features/archives/archives.service.js

const supabase = require('../../configs/database');
const notificationsService = require('../notifications/notifications.service');

const ARCHIVE_TABLE = 'archives';

// ============================================================
// ARCHIVE TYPES
// ============================================================

const ARCHIVE_TYPES = {
  RECORD: 'record',
  ANNOUNCEMENT: 'announcement',
  USER: 'user',
  CONSULTATION: 'consultation',
  APPOINTMENT: 'appointment',
  EXAMINATION: 'examination',
  AUDIT_LOG: 'audit_log',
  NOTIFICATION: 'notification',
};

// ============================================================
// ALLOWED ORIGINAL TABLES
// ============================================================

const ALLOWED_TABLES = new Set([
  'users',
  'announcements',
  'appointments',
  'consultations',
  'medical_records',
  'dental_records',
  'notifications',
]);

// ============================================================
// HELPERS
// ============================================================

const normalizeTableName = (tableName) => {
  return String(tableName || '')
    .trim()
    .toLowerCase();
};

const validateTableName = (tableName) => {
  const normalized = normalizeTableName(tableName);

  if (!normalized) {
    throw new Error('Table name is required');
  }

  if (!ALLOWED_TABLES.has(normalized)) {
    throw new Error(`Unsupported archive table: ${normalized}`);
  }

  return normalized;
};

const formatTableName = (tableName = '') => {
  return String(tableName)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getIdColumn = (tableName) => {
  return tableName === 'users' ? 'uid' : 'id';
};

const parseArchiveData = (value) => {
  if (!value) {
    return {};
  }

  if (
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        return parsed;
      }
    } catch (error) {
      console.warn(
        '[Archives] Failed to parse archived JSON data:',
        error.message
      );
    }
  }

  return {};
};

const getArchiveTypeForTable = (tableName) => {
  switch (tableName) {
    case 'users':
      return ARCHIVE_TYPES.USER;

    case 'announcements':
      return ARCHIVE_TYPES.ANNOUNCEMENT;

    case 'appointments':
      return ARCHIVE_TYPES.APPOINTMENT;

    case 'consultations':
      return ARCHIVE_TYPES.CONSULTATION;

    case 'medical_records':
    case 'dental_records':
      return ARCHIVE_TYPES.RECORD;

    case 'notifications':
      return ARCHIVE_TYPES.NOTIFICATION;

    default:
      return tableName;
  }
};

const getReferenceType = (tableName) => {
  switch (tableName) {
    case 'users':
      return 'Users';

    case 'announcements':
      return 'Announcement';

    case 'appointments':
      return 'Appointment';

    case 'consultations':
      return 'Consultation';

    case 'medical_records':
      return 'Medical Record';

    case 'dental_records':
      return 'Dental Record';

    case 'notifications':
      return 'Notification';

    default:
      return formatTableName(tableName);
  }
};

const getItemLabel = (tableName) => {
  switch (tableName) {
    case 'users':
      return 'user account';

    case 'announcements':
      return 'announcement';

    case 'appointments':
      return 'appointment';

    case 'consultations':
      return 'consultation';

    case 'medical_records':
      return 'medical record';

    case 'dental_records':
      return 'dental record';

    case 'notifications':
      return 'notification';

    default:
      return String(tableName || 'item')
        .replace(/_/g, ' ');
  }
};

/**
 * Resolve the owner of an archived item.
 *
 * Appointments:
 *   record.user_id
 *
 * Consultations:
 *   record.patient_id
 *
 * Medical/Dental records:
 *   record.user_id
 *
 * Notifications:
 *   record.user_id
 *
 * Announcements:
 *   no individual owner
 *
 * Users:
 *   skipped for permanent deletion notifications
 */
const resolveOwnerUserId = (
  tableName,
  record = {}
) => {
  switch (tableName) {
    case 'appointments':
      return (
        record.user_id ||
        record.userId ||
        null
      );

    case 'consultations':
      return (
        record.patient_id ||
        record.patientId ||
        record.user_id ||
        null
      );

    case 'medical_records':
    case 'dental_records':
      return (
        record.user_id ||
        record.userId ||
        null
      );

    case 'notifications':
      return (
        record.user_id ||
        record.userId ||
        null
      );

    case 'users':
      return (
        record.id ||
        record.uid ||
        null
      );

    case 'announcements':
    default:
      return null;
  }
};

const getArchiveRecord = async (
  id,
  tableName = null
) => {
  if (!id) {
    return null;
  }

  // First try archive primary key.
  const {
    data: byArchiveId,
    error: archiveIdError,
  } = await supabase
    .from(ARCHIVE_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (archiveIdError) {
    throw archiveIdError;
  }

  if (byArchiveId) {
    return byArchiveId;
  }

  // Then try original_id.
  let query = supabase
    .from(ARCHIVE_TABLE)
    .select('*')
    .eq('original_id', id)
    .is('restored_at', null)
    .eq('is_permanently_deleted', false)
    .order('archived_at', {
      ascending: false,
    })
    .limit(1);

  if (tableName) {
    const archiveType =
      getArchiveTypeForTable(tableName);

    query = query.eq('type', archiveType);
  }

  const {
    data: rows,
    error: originalIdError,
  } = await query;

  if (originalIdError) {
    throw originalIdError;
  }

  return rows?.[0] || null;
};

const getOriginalRecord = async (
  tableName,
  itemId
) => {
  const idColumn = getIdColumn(tableName);

  const {
    data,
    error,
  } = await supabase
    .from(tableName)
    .select('*')
    .eq(idColumn, itemId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
};

const notifyOwner = async ({
  ownerUserId,
  type,
  title,
  message,
  referenceId = null,
  referenceType = null,
}) => {
  if (!ownerUserId) {
    return null;
  }

  try {
    return await notificationsService
      .createNotification({
        type,
        title,
        message,
        userId: ownerUserId,
        referenceId,
        referenceType,
      });
  } catch (notificationError) {
    console.error(
      '[Archives] Failed to notify item owner:',
      notificationError.message
    );

    return null;
  }
};

// ============================================================
// MOVE ITEM TO ARCHIVES
// ============================================================

exports.moveToArchives = async ({
  type,
  originalId,
  data,
  deletedBy,
}) => {
  if (!type) {
    throw new Error('Archive type is required');
  }

  if (!originalId) {
    throw new Error('Original item ID is required');
  }

  if (!data) {
    throw new Error('Archived item data is required');
  }

  const archiveEntry = {
    type,
    original_id: originalId,

    // The column is JSONB, so store an object instead of
    // JSON.stringify(data).
    data:
      typeof data === 'string'
        ? parseArchiveData(data)
        : data,

    deleted_by:
      deletedBy || 'system',

    archived_at:
      new Date().toISOString(),

    permanent_delete_at:
      new Date(
        Date.now() +
          2 *
            365 *
            24 *
            60 *
            60 *
            1000
      ).toISOString(),

    is_permanently_deleted: false,
    restored_at: null,
  };

  const {
    data: result,
    error,
  } = await supabase
    .from(ARCHIVE_TABLE)
    .insert(archiveEntry)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Notify administrators that an item was archived.
  try {
    await notificationsService.notifyAdmins({
      type: 'archive',
      title: 'Item Archived',
      message:
        `${formatTableName(type)} with ID ` +
        `${originalId} was archived by ` +
        `${deletedBy || 'system'}.`,
      referenceId: originalId,
      referenceType: formatTableName(type),
    });
  } catch (notificationError) {
    console.error(
      '[Archives] Failed to create archive notification:',
      notificationError.message
    );
  }

  return result;
};

// ============================================================
// GET ALL ARCHIVES
// ============================================================

exports.getArchives = async ({
  type,
  search,
  page = 1,
  limit = 20,
}) => {
  const safePage = Math.max(
    Number.parseInt(page, 10) || 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(
      Number.parseInt(limit, 10) || 20,
      1
    ),
    100
  );

  let query = supabase
    .from(ARCHIVE_TABLE)
    .select('*', {
      count: 'exact',
    })
    .eq('is_permanently_deleted', false)
    .is('restored_at', null)
    .order('archived_at', {
      ascending: false,
    });

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  if (search) {
    const safeSearch = String(search)
      .trim()
      .replace(/[%(),]/g, '');

    if (safeSearch) {
      query = query.or(
        `data::text.ilike.%${safeSearch}%,` +
          `original_id::text.ilike.%${safeSearch}%`
      );
    }
  }

  const from =
    (safePage - 1) * safeLimit;

  const to =
    from + safeLimit - 1;

  query = query.range(from, to);

  const {
    data,
    error,
    count,
  } = await query;

  if (error) {
    throw error;
  }

  return {
    data: data || [],
    count: count || 0,
    page: safePage,
    limit: safeLimit,
  };
};

// ============================================================
// GET ARCHIVE BY ID
// ============================================================

exports.getArchiveById = async (id) => {
  if (!id) {
    throw new Error('Archive ID is required');
  }

  const {
    data,
    error,
  } = await supabase
    .from(ARCHIVE_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// ============================================================
// RESTORE FROM ARCHIVES
// ============================================================

exports.restoreFromArchives = async (
  id,
  tableName
) => {
  const normalizedTable =
    validateTableName(tableName);

  const idColumn =
    getIdColumn(normalizedTable);

  const archiveRecord =
    await getArchiveRecord(
      id,
      normalizedTable
    );

  const archivedData =
    parseArchiveData(
      archiveRecord?.data
    );

  const originalId =
    archiveRecord?.original_id ||
    archivedData?.[idColumn] ||
    id;

  let existingRecord =
    await getOriginalRecord(
      normalizedTable,
      originalId
    );

  let restoredRecord = null;

  // ----------------------------------------------------------
  // Existing original row:
  // soft archived item
  // ----------------------------------------------------------

  if (existingRecord) {
    const restoreUpdates = {
      is_archived: false,
    };

    if (
      Object.prototype.hasOwnProperty.call(
        existingRecord,
        'deleted_by'
      )
    ) {
      restoreUpdates.deleted_by = null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        existingRecord,
        'updated_at'
      )
    ) {
      restoreUpdates.updated_at =
        new Date().toISOString();
    }

    const {
      data,
      error,
    } = await supabase
      .from(normalizedTable)
      .update(restoreUpdates)
      .eq(idColumn, originalId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    restoredRecord = data;
  }

  // ----------------------------------------------------------
  // Original row no longer exists:
  // recreate it from archives.data
  // ----------------------------------------------------------

  else {
    if (
      !archiveRecord ||
      Object.keys(archivedData).length === 0
    ) {
      throw new Error(
        'Archived item data was not found and the original item no longer exists.'
      );
    }

    const insertData = {
      ...archivedData,
    };

    insertData[idColumn] =
      insertData[idColumn] ||
      originalId;

    if (
      Object.prototype.hasOwnProperty.call(
        insertData,
        'is_archived'
      )
    ) {
      insertData.is_archived = false;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        insertData,
        'deleted_by'
      )
    ) {
      insertData.deleted_by = null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        insertData,
        'updated_at'
      )
    ) {
      insertData.updated_at =
        new Date().toISOString();
    }

    const {
      data,
      error,
    } = await supabase
      .from(normalizedTable)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    restoredRecord = data;
  }

  // ----------------------------------------------------------
  // Mark archive entry restored
  // ----------------------------------------------------------

  if (archiveRecord) {
    const {
      error: archiveUpdateError,
    } = await supabase
      .from(ARCHIVE_TABLE)
      .update({
        restored_at:
          new Date().toISOString(),
      })
      .eq('id', archiveRecord.id);

    if (archiveUpdateError) {
      console.warn(
        '[Archives] Item restored, but archive metadata could not be updated:',
        archiveUpdateError.message
      );
    }
  }

  // ----------------------------------------------------------
  // Notify owner
  // ----------------------------------------------------------

  const ownerUserId =
    resolveOwnerUserId(
      normalizedTable,
      restoredRecord ||
        archivedData ||
        existingRecord
    );

  if (
    normalizedTable !== 'announcements' &&
    ownerUserId
  ) {
    const itemLabel =
      getItemLabel(normalizedTable);

    await notifyOwner({
      ownerUserId,
      type: 'archive_restored',
      title: 'Archived Item Restored',
      message:
        `Your archived ${itemLabel} ` +
        'has been restored by an administrator.',
      referenceId: originalId,
      referenceType:
        getReferenceType(normalizedTable),
    });
  }

  return {
    success: true,
    tableName: normalizedTable,
    id: originalId,
    restoredAt:
      new Date().toISOString(),
  };
};

// ============================================================
// PERMANENTLY DELETE
// ============================================================

exports.permanentDelete = async (
  id,
  tableName
) => {
  const normalizedTable =
    validateTableName(tableName);

  const idColumn =
    getIdColumn(normalizedTable);

  // ----------------------------------------------------------
  // Find archive entry first
  // ----------------------------------------------------------

  const archiveRecord =
    await getArchiveRecord(
      id,
      normalizedTable
    );

  const archivedData =
    parseArchiveData(
      archiveRecord?.data
    );

  const targetItemId =
    archiveRecord?.original_id ||
    archivedData?.[idColumn] ||
    id;

  // ----------------------------------------------------------
  // Load original row before deleting it
  // ----------------------------------------------------------

  let originalRecord = null;

  try {
    originalRecord =
      await getOriginalRecord(
        normalizedTable,
        targetItemId
      );
  } catch (fetchError) {
    console.warn(
      '[Archives] Could not retrieve original item before permanent deletion:',
      fetchError.message
    );
  }

  const ownerUserId =
    resolveOwnerUserId(
      normalizedTable,
      originalRecord ||
        archivedData
    );

  // ----------------------------------------------------------
  // Users: delete Supabase Auth account first
  // ----------------------------------------------------------

  if (normalizedTable === 'users') {
    const targetAuthUid =
      originalRecord?.uid ||
      archivedData?.uid ||
      targetItemId;

    console.log(
      `>>> [Archives] Attempting Auth deletion for UID: ${targetAuthUid}`
    );

    const {
      error: authError,
    } =
      await supabase.auth.admin.deleteUser(
        targetAuthUid
      );

    if (authError) {
      const authMessage =
        String(
          authError.message || ''
        ).toLowerCase();

      const isNotFoundError =
        authMessage.includes('not found') ||
        authError.status === 404;

      if (isNotFoundError) {
        console.warn(
          `>>> [Archives] User ${targetAuthUid} is already missing from Auth. Continuing database cleanup.`
        );
      } else {
        console.error(
          '>>> [Archives] Failed to delete user from Supabase Auth:',
          authError.message
        );

        throw new Error(
          'Cannot permanently delete user: ' +
            `Auth deletion failed - ${authError.message}`
        );
      }
    } else {
      console.log(
        '>>> [Archives] Successfully deleted user from Supabase Auth'
      );
    }
  }

  // ----------------------------------------------------------
  // Delete original database row
  // ----------------------------------------------------------

  const {
    error: dbError,
  } = await supabase
    .from(normalizedTable)
    .delete()
    .eq(idColumn, targetItemId);

  if (dbError) {
    throw dbError;
  }

  // ----------------------------------------------------------
  // Remove archive entry
  // ----------------------------------------------------------

  if (archiveRecord) {
    const {
      error: archiveCleanupError,
    } = await supabase
      .from(ARCHIVE_TABLE)
      .delete()
      .eq('id', archiveRecord.id);

    if (archiveCleanupError) {
      console.warn(
        '[Archives] Original item was deleted, but the archive entry could not be removed:',
        archiveCleanupError.message
      );
    }
  }

  // ----------------------------------------------------------
  // Notify owner
  //
  // Do not notify the permanently deleted user account.
  // Announcements have no individual owner.
  // ----------------------------------------------------------

  if (
    normalizedTable !== 'users' &&
    normalizedTable !== 'announcements' &&
    ownerUserId
  ) {
    const itemLabel =
      getItemLabel(normalizedTable);

    await notifyOwner({
      ownerUserId,
      type: 'permanent_deletion',
      title: 'Item Permanently Deleted',
      message:
        `Your archived ${itemLabel} ` +
        'has been permanently deleted by an administrator.',

      // There is no longer a usable original record ID.
      referenceId: null,

      // This makes the frontend display "Deleted".
      referenceType: 'Deleted',
    });
  }

  return {
    id: targetItemId,
    tableName: normalizedTable,
    success: true,
  };
};

// ============================================================
// CLEAN UP OLD ARCHIVES
// ============================================================

exports.cleanupOldArchives = async () => {
  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from(ARCHIVE_TABLE)
    .delete()
    .eq('is_permanently_deleted', false)
    .is('restored_at', null)
    .lt('permanent_delete_at', now)
    .select();

  if (error) {
    throw error;
  }

  return {
    deleted: data?.length || 0,
  };
};

// ============================================================
// GET ARCHIVE STATISTICS
// ============================================================

exports.getArchiveStats = async () => {
  const {
    data,
    error,
  } = await supabase
    .from(ARCHIVE_TABLE)
    .select('type')
    .eq('is_permanently_deleted', false)
    .is('restored_at', null);

  if (error) {
    throw error;
  }

  const stats = {
    total: data?.length || 0,
    records: 0,
    announcements: 0,
    users: 0,
    consultations: 0,
    appointments: 0,
    examinations: 0,
    audit_logs: 0,
    notifications: 0,
  };

  data?.forEach((item) => {
    const type =
      String(item.type || '')
        .trim()
        .toLowerCase();

    switch (type) {
      case 'record':
      case 'medical_record':
      case 'dental_record':
        stats.records += 1;
        break;

      case 'announcement':
        stats.announcements += 1;
        break;

      case 'user':
        stats.users += 1;
        break;

      case 'consultation':
        stats.consultations += 1;
        break;

      case 'appointment':
        stats.appointments += 1;
        break;

      case 'examination':
        stats.examinations += 1;
        break;

      case 'audit_log':
        stats.audit_logs += 1;
        break;

      case 'notification':
        stats.notifications += 1;
        break;

      default:
        break;
    }
  });

  return stats;
};

exports.ARCHIVE_TYPES = ARCHIVE_TYPES;

module.exports = exports;