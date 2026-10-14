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
  return String(tableName || '').trim().toLowerCase();
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

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
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

/**
 * Snapshots of medical/dental records may be saved with type
 * 'record', 'medical_record' or 'dental_record'. Match all of them.
 */
const getArchiveTypesForTable = (tableName) => {
  if (tableName === 'medical_records') return ['record', 'medical_record'];
  if (tableName === 'dental_records') return ['record', 'dental_record'];
  return [getArchiveTypeForTable(tableName)];
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
      return String(tableName || 'item').replace(/_/g, ' ');
  }
};

/**
 * Resolve the owner of an archived item.
 * Announcements have no individual owner.
 */
const resolveOwnerUserId = (tableName, record = {}) => {
  switch (tableName) {
    case 'appointments':
      return record.user_id || record.userId || null;

    case 'consultations':
      return (
        record.patient_id ||
        record.patientId ||
        record.user_id ||
        null
      );

    case 'medical_records':
    case 'dental_records':
    case 'notifications':
      return record.user_id || record.userId || null;

    case 'users':
      return record.id || record.uid || null;

    case 'announcements':
    default:
      return null;
  }
};

const getArchiveRecord = async (id, tableName = null) => {
  if (!id) {
    return null;
  }

  // First try archive primary key.
  const { data: byArchiveId, error: archiveIdError } = await supabase
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
    .order('archived_at', { ascending: false })
    .limit(1);

  if (tableName) {
    query = query.in('type', getArchiveTypesForTable(tableName));
  }

  const { data: rows, error: originalIdError } = await query;

  if (originalIdError) {
    throw originalIdError;
  }

  return rows?.[0] || null;
};

const getOriginalRecord = async (tableName, itemId) => {
  const idColumn = getIdColumn(tableName);

  const { data, error } = await supabase
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
    return await notificationsService.createNotification({
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
// COMBINED SOURCES
//
// 1. Original tables: rows where is_archived = true
// 2. archives table:  snapshots (e.g. rows whose original was
//                     hard-deleted)
//
// Audit logs / examinations in the archives table are NOT
// listed here; they are history, not restorable items.
// ============================================================

const toName = (r) =>
  `${r.last_name || ''}, ${r.first_name || ''} ${
    r.middle_name ? r.middle_name + ' ' : ''
  }`.trim();

const SOURCES = [
  {
    table: 'users',
    type: 'user',
    select: '*',
    originalId: (r) => r.uid,
    map: (r) => ({
      id: r.uid,
      displayName:
        `${r.first_name || ''} ${r.last_name || ''}`.trim() ||
        r.email ||
        r.university_id ||
        'User',
      detail: r.university_id || r.email || '',
    }),
  },
  {
    table: 'announcements',
    type: 'announcement',
    select: '*',
    originalId: (r) => r.id,
    map: (r) => ({
      id: r.id,
      displayName: r.title || 'Announcement',
      detail: `Posted: ${r.author_name || 'Admin'}`,
    }),
  },
  {
    table: 'appointments',
    type: 'appointment',
    select: '*',
    originalId: (r) => r.id,
    map: (r) => ({
      id: r.id,
      displayName: r.patient_name || r.reason || 'Appointment',
      detail: `${r.service_type || 'Medical'} - ${r.reason || 'No reason'}`,
    }),
  },
  {
    table: 'consultations',
    type: 'consultation',
    select: '*',
    originalId: (r) => r.id,
    map: (r) => ({
      id: r.id,
      displayName: r.patient_name || 'Consultation',
      detail: `${r.consultation_type || 'General'} - ${r.status || ''}`,
    }),
  },
  {
    table: 'medical_records',
    type: 'medical_record',
    select: '*',
    originalId: (r) => r.id,
    map: (r) => ({
      id: r.id,
      displayName: toName(r) || 'Medical Record',
      detail: `ID: ${r.university_id || 'N/A'} | Visit: ${r.exam_date || 'N/A'}`,
    }),
  },
  {
    table: 'dental_records',
    type: 'dental_record',
    select: '*',
    originalId: (r) => r.id,
    map: (r) => ({
      id: r.id,
      displayName: toName(r) || 'Dental Record',
      detail: `ID: ${r.university_id || 'N/A'} | Visit: ${r.exam_date || 'N/A'}`,
    }),
  },
  {
    table: 'notifications',
    type: 'notification',
    select:
      '*, _user:users!notifications_user_id_fkey(first_name, last_name, email)',
    originalId: (r) => r.id,
    map: (r) => {
      const u = r._user || {};
      const recipient =
        `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
        u.email ||
        'Unknown User';

      return {
        id: r.id,
        displayName: r.title || 'Notification',
        detail: `To: ${recipient} | ${r.message || ''}`,
      };
    },
    deletedBy: () => 'System',
    updatedAt: (r) => r.created_at || r.updated_at,
  },
];

const SOURCE_BY_TABLE = Object.fromEntries(SOURCES.map((s) => [s.table, s]));

const matchesType = (typeFilter, itemType) => {
  if (!typeFilter || typeFilter === 'all') return true;
  if (typeFilter === 'record') {
    return itemType === 'medical_record' || itemType === 'dental_record';
  }
  return itemType === typeFilter;
};

/** Source 1: original tables, is_archived = true */
const fetchSoftArchived = async (typeFilter = 'all') => {
  const sources = SOURCES.filter((s) => matchesType(typeFilter, s.type));

  const results = await Promise.all(
    sources.map(async (s) => {
      const { data, error } = await supabase
        .from(s.table)
        .select(s.select)
        .eq('is_archived', true);

      if (error) {
        // One bad table should not break the whole list.
        console.error(`[Archives] Failed to fetch ${s.table}:`, error.message);
        return [];
      }

      return (data || []).map((r) => ({
        ...r,
        ...s.map(r),
        archiveType: s.type,
        table: s.table,
        originalId: s.originalId(r),
        archiveId: null,
        source: 'table',
        deletedBy: s.deletedBy ? s.deletedBy(r) : r.deleted_by || 'System',
        updated_at: s.updatedAt ? s.updatedAt(r) : r.updated_at || r.created_at,
      }));
    })
  );

  return results.flat();
};

/**
 * archives.type 'record' covers both medical and dental records.
 * Decide which table it belongs to from the snapshot contents.
 * ADJUST the heuristic below if your dental rows have a better
 * marker (e.g. a column that only exists on dental_records).
 */
const resolveTableFromArchiveRow = (row, data) => {
  switch (row.type) {
    case 'user':
      return 'users';
    case 'announcement':
      return 'announcements';
    case 'appointment':
      return 'appointments';
    case 'consultation':
      return 'consultations';
    case 'notification':
      return 'notifications';
    case 'medical_record':
      return 'medical_records';
    case 'dental_record':
      return 'dental_records';
    case 'record': {
      const looksDental = Object.keys(data).some((k) =>
        /dental|teeth|tooth/i.test(k)
      );
      return looksDental ? 'dental_records' : 'medical_records';
    }
    default:
      // audit_log, examination, unknown: not listed
      return null;
  }
};

/** Source 2: the archives table */
const fetchArchiveTableItems = async (typeFilter = 'all') => {
  const { data, error } = await supabase
    .from(ARCHIVE_TABLE)
    .select('*')
    .eq('is_permanently_deleted', false)
    .is('restored_at', null);

  if (error) {
    console.error('[Archives] Failed to fetch archives table:', error.message);
    return [];
  }

  const items = [];

  (data || []).forEach((row) => {
    const snapshot = parseArchiveData(row.data);
    const table = resolveTableFromArchiveRow(row, snapshot);
    const source = table ? SOURCE_BY_TABLE[table] : null;

    if (!source || !matchesType(typeFilter, source.type)) return;

    items.push({
      ...snapshot,
      ...source.map(snapshot),
      archiveType: source.type,
      table: source.table,
      originalId: row.original_id || source.originalId(snapshot),
      archiveId: row.id,
      source: 'archives',
      deletedBy: row.deleted_by || 'System',
      updated_at: row.archived_at,
    });
  });

  return items;
};

/** Merge both sources, one entry per (table, originalId). */
const fetchCombinedArchives = async (typeFilter = 'all') => {
  const [tableItems, archiveItems] = await Promise.all([
    fetchSoftArchived(typeFilter),
    fetchArchiveTableItems(typeFilter),
  ]);

  const merged = new Map();
  const keyOf = (i) => `${i.table}:${i.originalId}`;

  // The live row wins because it reflects the current data.
  tableItems.forEach((i) => merged.set(keyOf(i), i));

  archiveItems.forEach((a) => {
    const existing = merged.get(keyOf(a));

    if (existing) {
      existing.archiveId = a.archiveId;
      existing.source = 'both';
    } else {
      merged.set(keyOf(a), a);
    }
  });

  return Array.from(merged.values());
};

// ============================================================
// MOVE ITEM TO ARCHIVES
// ============================================================

exports.moveToArchives = async ({ type, originalId, data, deletedBy }) => {
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

    // The column is JSONB, so store an object instead of JSON.stringify(data).
    data: typeof data === 'string' ? parseArchiveData(data) : data,

    deleted_by: deletedBy || 'system',
    archived_at: new Date().toISOString(),
    permanent_delete_at: new Date(
      Date.now() + 2 * 365 * 24 * 60 * 60 * 1000
    ).toISOString(),

    is_permanently_deleted: false,
    restored_at: null,
  };

  const { data: result, error } = await supabase
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
// GET ALL ARCHIVES (combined)
// ============================================================

exports.getArchives = async ({ type, search, page = 1, limit = 20 }) => {
  const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);

  const safeLimit = Math.min(
    Math.max(Number.parseInt(limit, 10) || 20, 1),
    100
  );

  let items = await fetchCombinedArchives(type);

  if (search) {
    const s = String(search).trim().toLowerCase();

    if (s) {
      items = items.filter((a) =>
        `${a.displayName} ${a.detail} ${a.deletedBy} ${a.archiveType}`
          .toLowerCase()
          .includes(s)
      );
    }
  }

  items.sort(
    (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
  );

  const from = (safePage - 1) * safeLimit;

  return {
    data: items.slice(from, from + safeLimit),
    count: items.length,
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

  const { data, error } = await supabase
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
//
// Works for both sources:
//  - soft archived row in the original table -> is_archived = false
//  - archives-only snapshot -> row re-created from archives.data
// ============================================================

exports.restoreFromArchives = async (id, tableName) => {
  const normalizedTable = validateTableName(tableName);
  const idColumn = getIdColumn(normalizedTable);

  const archiveRecord = await getArchiveRecord(id, normalizedTable);
  const archivedData = parseArchiveData(archiveRecord?.data);

  const originalId =
    archiveRecord?.original_id || archivedData?.[idColumn] || id;

  const existingRecord = await getOriginalRecord(normalizedTable, originalId);

  let restoredRecord = null;

  if (existingRecord) {
    const restoreUpdates = { is_archived: false };

    if (Object.prototype.hasOwnProperty.call(existingRecord, 'deleted_by')) {
      restoreUpdates.deleted_by = null;
    }

    if (Object.prototype.hasOwnProperty.call(existingRecord, 'updated_at')) {
      restoreUpdates.updated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from(normalizedTable)
      .update(restoreUpdates)
      .eq(idColumn, originalId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    restoredRecord = data;
  } else {
    if (!archiveRecord || Object.keys(archivedData).length === 0) {
      throw new Error(
        'Archived item data was not found and the original item no longer exists.'
      );
    }

    const insertData = { ...archivedData };

    insertData[idColumn] = insertData[idColumn] || originalId;

    if (Object.prototype.hasOwnProperty.call(insertData, 'is_archived')) {
      insertData.is_archived = false;
    }

    if (Object.prototype.hasOwnProperty.call(insertData, 'deleted_by')) {
      insertData.deleted_by = null;
    }

    if (Object.prototype.hasOwnProperty.call(insertData, 'updated_at')) {
      insertData.updated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from(normalizedTable)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    restoredRecord = data;
  }

  // Mark archive entry restored (if one exists)
  if (archiveRecord) {
    const { error: archiveUpdateError } = await supabase
      .from(ARCHIVE_TABLE)
      .update({ restored_at: new Date().toISOString() })
      .eq('id', archiveRecord.id);

    if (archiveUpdateError) {
      console.warn(
        '[Archives] Item restored, but archive metadata could not be updated:',
        archiveUpdateError.message
      );
    }
  }

  // Notify owner
  const ownerUserId = resolveOwnerUserId(
    normalizedTable,
    restoredRecord || archivedData || existingRecord
  );

  if (normalizedTable !== 'announcements' && ownerUserId) {
    await notifyOwner({
      ownerUserId,
      type: 'archive_restored',
      title: 'Archived Item Restored',
      message:
        `Your archived ${getItemLabel(normalizedTable)} ` +
        'has been restored by an administrator.',
      referenceId: originalId,
      referenceType: getReferenceType(normalizedTable),
    });
  }

  return {
    success: true,
    tableName: normalizedTable,
    id: originalId,
    restoredAt: new Date().toISOString(),
  };
};


// ============================================================
// PERMANENTLY DELETE
// Supports:
// 1. Soft-archived rows still present in their original table
// 2. Snapshots stored in the archives table
// 3. Items identified by either archive ID or original ID
// ============================================================

exports.permanentDelete = async (id, tableName) => {
  if (!id) {
    throw new Error('Archive item ID is required');
  }

  const normalizedTable = validateTableName(tableName);
  const idColumn = getIdColumn(normalizedTable);
  const archiveTypes = getArchiveTypesForTable(normalizedTable);

  console.log('[Archives] Permanent deletion requested:', {
    id,
    tableName: normalizedTable,
    idColumn,
  });

  // First determine whether the supplied ID is an archive row ID.
  const { data: archiveById, error: archiveIdError } = await supabase
    .from(ARCHIVE_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (archiveIdError) {
    throw new Error(
      `Failed to find archive entry: ${archiveIdError.message}`
    );
  }

  // If it wasn't an archive ID, look for a snapshot by original ID.
  let archiveRecord = archiveById;

  if (!archiveRecord) {
    const { data: matchingArchives, error: originalIdError } = await supabase
      .from(ARCHIVE_TABLE)
      .select('*')
      .eq('original_id', id)
      .in('type', archiveTypes)
      .order('archived_at', { ascending: false })
      .limit(1);

    if (originalIdError) {
      throw new Error(
        `Failed to find archived item: ${originalIdError.message}`
      );
    }

    archiveRecord = matchingArchives?.[0] || null;
  }

  // Prevent an archive ID for one type from deleting another type.
  if (archiveRecord && !archiveTypes.includes(archiveRecord.type)) {
    throw new Error(
      `The selected archive entry is type "${archiveRecord.type}", ` +
      `not "${normalizedTable}". Refresh the Archives page and try again.`
    );
  }

  const archivedData = parseArchiveData(archiveRecord?.data);

  // Prefer the original ID saved in the archive snapshot.
  const targetItemId =
    archiveRecord?.original_id ||
    archivedData?.[idColumn] ||
    id;

  console.log('[Archives] Resolved permanent deletion target:', {
    suppliedId: id,
    archiveId: archiveRecord?.id || null,
    originalId: targetItemId,
    tableName: normalizedTable,
  });

  // Retrieve the original row if it still exists.
  let originalRecord = null;

  try {
    originalRecord = await getOriginalRecord(
      normalizedTable,
      targetItemId
    );
  } catch (error) {
    throw new Error(
      `Failed to check the original ${normalizedTable} record: ${error.message}`
    );
  }

  const ownerUserId = resolveOwnerUserId(
    normalizedTable,
    originalRecord || archivedData
  );

  // Delete the associated Supabase Auth account for user records.
  if (normalizedTable === 'users') {
    const targetAuthUid =
      originalRecord?.uid ||
      archivedData?.uid ||
      targetItemId;

    if (targetAuthUid) {
      const { error: authError } =
        await supabase.auth.admin.deleteUser(targetAuthUid);

      if (authError) {
        const message = String(authError.message || '').toLowerCase();
        const alreadyMissing =
          message.includes('not found') || authError.status === 404;

        if (!alreadyMissing) {
          throw new Error(
            `Cannot permanently delete user: Auth deletion failed: ` +
            authError.message
          );
        }

        console.warn(
          '[Archives] Auth account already missing; continuing:',
          targetAuthUid
        );
      }
    }
  }

  // Delete the original record if it still exists.
  if (originalRecord) {
    const { data: deletedRows, error: deleteError } = await supabase
      .from(normalizedTable)
      .delete()
      .eq(idColumn, targetItemId)
      .select(idColumn);

    if (deleteError) {
      console.error('[Archives] Original record deletion failed:', {
        tableName: normalizedTable,
        targetItemId,
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
      });

      throw new Error(
        `Could not permanently delete the original ${normalizedTable} record: ` +
        deleteError.message
      );
    }

    if (!deletedRows || deletedRows.length === 0) {
      throw new Error(
        `No ${normalizedTable} record was deleted. Check the record ID ` +
        `and database permissions.`
      );
    }
  }

  // Remove every matching, unrestored snapshot for this item.
  // This also handles duplicate snapshots for the same original record.
  let cleanupQuery = supabase
    .from(ARCHIVE_TABLE)
    .delete()
    .eq('original_id', targetItemId)
    .in('type', archiveTypes)
    .select('id');

  const { data: removedArchives, error: cleanupError } =
    await cleanupQuery;

  if (cleanupError) {
    console.error('[Archives] Archive cleanup failed:', {
      targetItemId,
      tableName: normalizedTable,
      code: cleanupError.code,
      message: cleanupError.message,
      details: cleanupError.details,
      hint: cleanupError.hint,
    });

    throw new Error(
      `The original record may have been deleted, but its archive entry ` +
      `could not be removed: ${cleanupError.message}`
    );
  }

  // A snapshot may be identified by its archive ID even when its
  // original_id is missing or differs from the snapshot ID.
  if (
    archiveRecord &&
    !(removedArchives || []).some((row) => row.id === archiveRecord.id)
  ) {
    const { data: removedArchive, error: archiveError } = await supabase
      .from(ARCHIVE_TABLE)
      .delete()
      .eq('id', archiveRecord.id)
      .select('id');

    if (archiveError) {
      throw new Error(
        `The original record may have been deleted, but archive cleanup ` +
        `failed: ${archiveError.message}`
      );
    }

    if (!removedArchive || removedArchive.length === 0) {
      throw new Error(
        'The archive entry was not removed. Check database permissions.'
      );
    }
  }

  // Notify the owner where appropriate.
  if (
    normalizedTable !== 'users' &&
    normalizedTable !== 'announcements' &&
    ownerUserId
  ) {
    await notifyOwner({
      ownerUserId,
      type: 'permanent_deletion',
      title: 'Item Permanently Deleted',
      message:
        `Your archived ${getItemLabel(normalizedTable)} ` +
        'has been permanently deleted by an administrator.',
      referenceId: null,
      referenceType: 'Deleted',
    });
  }

  console.log('[Archives] Permanent deletion completed:', {
    targetItemId,
    tableName: normalizedTable,
    archiveEntriesRemoved: removedArchives?.length || 0,
  });

  return {
    id: targetItemId,
    archiveId: archiveRecord?.id || null,
    tableName: normalizedTable,
    success: true,
  };
};


// ============================================================
// CLEAN UP OLD ARCHIVES
// ============================================================

exports.cleanupOldArchives = async () => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
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
// GET ARCHIVE STATISTICS (from the combined list)
// ============================================================

exports.getArchiveStats = async () => {
  const items = await fetchCombinedArchives('all');
  const count = (t) => items.filter((i) => i.archiveType === t).length;

  return {
    total: items.length,
    records: count('medical_record') + count('dental_record'),
    announcements: count('announcement'),
    users: count('user'),
    consultations: count('consultation'),
    appointments: count('appointment'),
    notifications: count('notification'),
  };
};

exports.ARCHIVE_TYPES = ARCHIVE_TYPES;

module.exports = exports;