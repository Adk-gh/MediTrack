// features/archives/archives.service.js
const supabase = require('../../configs/database');
const supabaseAuth = require('../../configs/database');

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

// Move an item to archives
exports.moveToArchives = async ({ type, originalId, data, deletedBy }) => {
  const archiveEntry = {
    type,
    original_id: originalId,
    data: JSON.stringify(data),
    deleted_by: deletedBy,
    archived_at: new Date().toISOString(),
    permanent_delete_at: new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)).toISOString(), // 2 years
    is_permanently_deleted: false
  };

  const { data: result, error } = await supabase
    .from(ARCHIVE_TABLE)
    .insert(archiveEntry)
    .select()
    .single();

  if (error) throw error;
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

// Restore an item from archives - simple version
// The frontend fetches directly from original tables where is_archived = true
// This endpoint just sets is_archived = false
exports.restoreFromArchives = async (id, tableName) => {
  if (!tableName) {
    throw new Error('Table name is required');
  }

  // For users, the ID column is 'uid', for others it's 'id'
  const idColumn = tableName === 'users' ? 'uid' : 'id';

  // Restore by setting is_archived to false
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

  return { success: true, tableName, id };
};

// Permanently delete an archive entry
// Permanently delete an archive entry
exports.permanentDelete = async (id, tableName) => {
  if (!tableName) {
    throw new Error('Table name is required');
  }

  // Determine the correct ID column for the main table deletion
  const idColumn = tableName === 'users' ? 'uid' : 'id';

  // 1. Find the archive record (check both the archive 'id' and 'original_id')
  // We use maybeSingle() so it doesn't throw an error if the archive record is missing
  const { data: archiveRecord } = await supabase
    .from(ARCHIVE_TABLE)
    .select('*')
    .or(`id.eq.${id},original_id.eq.${id}`)
    .maybeSingle();

  // 2. Identify the target Auth UID
  // If we found an archive record, use its original_id. Otherwise, assume the 'id' passed IS the original UID.
  let targetAuthUid = id;
  if (archiveRecord && archiveRecord.original_id) {
    targetAuthUid = archiveRecord.original_id;
  }

  // 3. For users, delete from Supabase Auth FIRST
  if (tableName === 'users') {
    console.log(`>>> [Archives] Attempting Auth deletion for UID: ${targetAuthUid}`);
    const { error: authError } = await supabase.auth.admin.deleteUser(targetAuthUid);

    if (authError) {
      const isNotFoundError = authError.message.toLowerCase().includes('not found') || authError.status === 404;

      if (isNotFoundError) {
        console.warn(`>>> [Archives] User ${targetAuthUid} already missing from Auth. Proceeding with DB cleanup.`);
      } else {
        console.error('>>> [Archives] Failed to delete user from Supabase Auth:', authError.message);
        throw new Error(`Cannot permanently delete user: Auth deletion failed - ${authError.message}`);
      }
    } else {
      console.log('>>> [Archives] Successfully deleted user from Supabase Auth');
    }
  }

  // 4. Delete from the original table (e.g., public.users)
  const { error: dbError } = await supabase
    .from(tableName)
    .delete()
    .eq(idColumn, targetAuthUid);

  if (dbError) throw dbError;

  // 5. Clean up the row in the ARCHIVE_TABLE (if it exists)
  if (archiveRecord) {
    const { error: archiveCleanupError } = await supabase
      .from(ARCHIVE_TABLE)
      .delete()
      .eq('id', archiveRecord.id);

    if (archiveCleanupError) {
      console.warn(`>>> [Archives] Warning: Failed to clean up archives table`, archiveCleanupError.message);
    }
  }

  return { id: targetAuthUid, tableName, success: true };
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