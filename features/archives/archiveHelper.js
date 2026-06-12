// features/archives/archiveHelper.js
// Helper utility to move items to archives before deletion
const archivesController = require('./archives.controller');

/**
 * Archive and delete a record
 * @param {object} options
 * @param {string} options.type - Archive type (record, announcement, user, etc.)
 * @param {string} options.originalId - Original record ID
 * @param {string} options.tableName - Supabase table name
 * @param {string} options.idColumn - Column name for ID (default: 'id')
 * @param {object} options.deletedBy - User info who deleted
 * @param {object} supabaseClient - Supabase client instance
 */
exports.archiveAndDelete = async ({ type, originalId, tableName, idColumn = 'id', deletedBy }, supabaseClient) => {
  // 1. Get the record data before deletion
  const { data: recordData, error: fetchError } = await supabaseClient
    .from(tableName)
    .select('*')
    .eq(idColumn, originalId)
    .single();

  if (fetchError) {
    console.error(`Error fetching ${tableName} for archive:`, fetchError);
    // Continue with deletion even if fetch fails
  }

  // 2. Move to archives
  if (recordData) {
    try {
      await archivesController.moveToArchives({
        type,
        originalId,
        data: recordData,
        deletedBy: deletedBy?.email || deletedBy?.id || 'system'
      });
    } catch (archiveError) {
      console.error('Error moving to archives:', archiveError);
      // Continue with deletion even if archiving fails
    }
  }

  // 3. Delete from original table
  const { error: deleteError } = await supabaseClient
    .from(tableName)
    .delete()
    .eq(idColumn, originalId);

  if (deleteError) throw deleteError;
  return { id: originalId, archived: !!recordData };
};

module.exports = exports;