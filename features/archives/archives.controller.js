// features/archives/archives.controller.js
const archivesService = require('./archives.service');

// Get all archives
exports.getArchives = async (req, res, next) => {
  try {
    const { type, search, page, limit } = req.query;
    const result = await archivesService.getArchives({
      type,
      search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Get archive by ID
exports.getArchiveById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const archive = await archivesService.getArchiveById(id);
    res.json({ success: true, data: archive });
  } catch (error) {
    next(error);
  }
};

// Restore from archives
exports.restoreFromArchives = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await archivesService.restoreFromArchives(id);
    res.json({ success: true, message: 'Item restored successfully', data: result });
  } catch (error) {
    next(error);
  }
};

// Permanently delete
exports.permanentDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    await archivesService.permanentDelete(id);
    res.json({ success: true, message: 'Item permanently deleted' });
  } catch (error) {
    next(error);
  }
};

// Cleanup old archives (can be called by cron or manually)
exports.cleanupOldArchives = async (req, res, next) => {
  try {
    const result = await archivesService.cleanupOldArchives();
    res.json({ success: true, message: `Deleted ${result.deleted} old archives`, data: result });
  } catch (error) {
    next(error);
  }
};

// Get archive statistics
exports.getArchiveStats = async (req, res, next) => {
  try {
    const stats = await archivesService.getArchiveStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// Move to archives (internal - called by other services)
exports.moveToArchives = async ({ type, originalId, data, deletedBy }) => {
  return archivesService.moveToArchives({ type, originalId, data, deletedBy });
};

module.exports = exports;