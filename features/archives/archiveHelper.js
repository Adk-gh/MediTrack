// features/archives/archiveHelper.js
// Helper utility to move items to archives before deletion
const archivesController = require('./archives.controller');

/**
 * Archive and delete a record
 * @param {object} options
 * @param {string} options.type - Archive type. Use 'medical_record' / 'dental_record'
 *                                for those tables so they can be told apart.
 * @param {string} options.originalId - Original record ID
 * @param {string} options.tableName - Supabase table name
 * @param {string} options.idColumn - Column name for ID (default: 'id')
 * @param {object} options.deletedBy - User info who deleted
 * @param {object} supabaseClient - Supabase client instance
 */
exports.archiveAndDelete = async (
  { type, originalId, tableName, idColumn = 'id', deletedBy },
  supabaseClient
) => {
  // 1. Get the record data before deletion
  const { data: recordData, error: fetchError } = await supabaseClient
    .from(tableName)
    .select('*')
    .eq(idColumn, originalId)
    .maybeSingle();

  // Never delete something we could not snapshot.
  if (fetchError) {
    console.error(`Error fetching ${tableName} for archive:`, fetchError);
    throw fetchError;
  }

  if (!recordData) {
    throw new Error(`${tableName} item ${originalId} was not found`);
  }

  // 2. Move to archives (must succeed before we delete anything)
  let archiveEntry;

  try {
    archiveEntry = await archivesController.moveToArchives({
      type,
      originalId,
      data: recordData,
      deletedBy: deletedBy?.email || deletedBy?.id || 'system',
    });
  } catch (archiveError) {
    console.error('Error moving to archives:', archiveError);
    throw archiveError;
  }

  // 3. Delete from original table
  const { error: deleteError } = await supabaseClient
    .from(tableName)
    .delete()
    .eq(idColumn, originalId);

  if (deleteError) {
    // Roll back the snapshot so it doesn't show up as an archived item
    // whose original row still exists.
    if (archiveEntry?.id) {
      const { error: rollbackError } = await supabaseClient
        .from('archives')
        .delete()
        .eq('id', archiveEntry.id);

      if (rollbackError) {
        console.warn(
          '[Archives] Could not roll back snapshot after failed delete:',
          rollbackError.message
        );
      }
    }

    throw deleteError;
  }

  return { id: originalId, archived: true };
};

module.exports = exports;