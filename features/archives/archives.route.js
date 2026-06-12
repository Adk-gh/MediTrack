// features/archives/archives.route.js
const express = require('express');
const router = express.Router();
const archivesController = require('./archives.controller');
const { authorized } = require('../../middleware/authorized');

// Get all archives (admin only)
router.get('/', authorized, archivesController.getArchives);

// Get archive statistics (admin only)
router.get('/stats', authorized, archivesController.getArchiveStats);

// Get archive by ID (admin only)
router.get('/:id', authorized, archivesController.getArchiveById);

// Restore from archives (admin only)
router.post('/:id/restore', authorized, archivesController.restoreFromArchives);

// Permanently delete (admin only)
router.delete('/:id', authorized, archivesController.permanentDelete);

// Cleanup old archives (admin only) - can be triggered manually or via cron
router.post('/cleanup', authorized, archivesController.cleanupOldArchives);

module.exports = router;