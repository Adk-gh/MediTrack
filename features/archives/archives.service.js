// features/archives/archives.service.js
const { supabase } = require('../../configs/database');

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

// Restore an item from archives
exports.restoreFromArchives = async (id) => {
  // Get the archive entry
  const archive = await exports.getArchiveById(id);
  if (!archive) throw new Error('Archive not found');

  const data = typeof archive.data === 'string' ? JSON.parse(archive.data) : archive.data;
  const { type, original_id: originalId } = archive;

  let result;

  switch (type) {
    case ARCHIVE_TYPES.RECORD:
      // Restore to users table
      const { error: recordError } = await supabase
        .from('users')
        .insert({ ...data, id: originalId });
      if (recordError) throw recordError;
      break;

    case ARCHIVE_TYPES.ANNOUNCEMENT:
      const { error: announceError } = await supabase
        .from('announcements')
        .insert({ ...data, id: originalId });
      if (announceError) throw announceError;
      break;

    case ARCHIVE_TYPES.USER:
      // Restore to users table (different structure)
      const { error: userError } = await supabase
        .from('users')
        .insert(data);
      if (userError) throw userError;
      break;

    case ARCHIVE_TYPES.CONSULTATION:
      const { error: consultError } = await supabase
        .from('consultations')
        .insert({ ...data, id: originalId });
      if (consultError) throw consultError;
      break;

    case ARCHIVE_TYPES.APPOINTMENT:
      const { error: apptError } = await supabase
        .from('appointments')
        .insert({ ...data, id: originalId });
      if (apptError) throw apptError;
      break;

    case ARCHIVE_TYPES.EXAMINATION:
      // Try medical first, then dental
      const { error: examError } = await supabase
        .from('medical_examinations')
        .insert({ ...data, id: originalId });
      if (examError) {
        const { error: dentalError } = await supabase
          .from('dental_examinations')
          .insert({ ...data, id: originalId });
        if (dentalError) throw dentalError;
      }
      break;

    case ARCHIVE_TYPES.AUDIT_LOG:
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({ ...data, id: originalId });
      if (auditError) throw auditError;
      break;

    default:
      throw new Error(`Unknown archive type: ${type}`);
  }

  // Mark as permanently deleted (since it's been restored)
  const { error: updateError } = await supabase
    .from(ARCHIVE_TABLE)
    .update({ is_permanently_deleted: true, restored_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) throw updateError;

  return { success: true, type, originalId };
};

// Permanently delete an archive entry
exports.permanentDelete = async (id) => {
  const { error } = await supabase
    .from(ARCHIVE_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { id };
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