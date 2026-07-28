// features/archives/archives.route.js
const express = require('express');
const router = express.Router();
const archivesController = require('./archives.controller');
const { authorized } = require('../../middleware/authorized');
const { auditLog } = require('../../middleware/auditLogger');

// Archive an item (admin only)
router.post('/', authorized, auditLog('create', 'archive', (req) => `Archived item: ${req.body.type || 'unknown'}`), archivesController.archiveItem);

// Get all archives (admin only)
router.get('/', authorized, archivesController.getArchives);

// Get archive statistics (admin only)
router.get('/stats', authorized, archivesController.getArchiveStats);

// Get archive by ID (admin only)
router.get('/:id', authorized, archivesController.getArchiveById);

// Restore from archives (admin only)
router.post('/:id/restore', authorized, async (req, res, next) => {
  // Get item details for audit log based on table type
  let itemDetails = '';
  const { table } = req.query;

  if (table) {
    const idColumn = table === 'users' ? 'uid' : 'id';
    try {
      let selectFields = '*';
      if (table === 'users') {
        selectFields = 'first_name, middle_name, last_name, university_id';
      } else if (table === 'announcements') {
        selectFields = 'title';
      } else if (table === 'consultations') {
        selectFields = 'patient_name, consultation_type';
      } else if (table === 'appointments') {
        selectFields = 'patient_name, service_type';
      }

      const { data: item } = await supabase
        .from(table)
        .select(selectFields)
        .eq(idColumn, req.params.id)
        .single();

      if (item) {
        if (table === 'users') {
          itemDetails = `${item.first_name || ''} ${item.middle_name || ''} ${item.last_name || ''}`.trim().replace(/\s+/g, ' ') + (item.university_id ? ` (${item.university_id})` : '');
        } else if (table === 'announcements') {
          itemDetails = item.title || '';
        } else if (table === 'consultations') {
          itemDetails = `${item.patient_name || ''} (${item.consultation_type || 'consultation'})`.trim();
        } else if (table === 'appointments') {
          itemDetails = `${item.patient_name || ''} - ${item.service_type || ''}`.trim();
        }
      }
    } catch (e) {}
  }

  req.itemDetails = itemDetails;
  next();
}, auditLog('restore', 'archive', (req) => {
  const details = req.itemDetails ? ` - ${req.itemDetails}` : '';
  return `Restored archive ID: ${req.params.id}${details}`;
}), archivesController.restoreFromArchives);

// Permanently delete (admin only)
router.delete('/:id/delete', authorized, async (req, res, next) => {
  // Get item details for audit log based on table type
  let itemDetails = '';
  const { table } = req.query;

  if (table) {
    const idColumn = table === 'users' ? 'uid' : 'id';
    try {
      let selectFields = '*';
      if (table === 'users') {
        selectFields = 'first_name, middle_name, last_name, university_id';
      } else if (table === 'announcements') {
        selectFields = 'title';
      }

      const { data: item } = await supabase
        .from(table)
        .select(selectFields)
        .eq(idColumn, req.params.id)
        .single();

      if (item) {
        if (table === 'users') {
          itemDetails = `${item.first_name || ''} ${item.middle_name || ''} ${item.last_name || ''}`.trim().replace(/\s+/g, ' ') + (item.university_id ? ` (${item.university_id})` : '');
        } else if (table === 'announcements') {
          itemDetails = item.title || '';
        }
      }
    } catch (e) {}
  }

  req.itemDetails = itemDetails;
  next();
}, auditLog('delete', 'archive', (req) => {
  const details = req.itemDetails ? ` - ${req.itemDetails}` : '';
  return `Permanently deleted archive ID: ${req.params.id}${details}`;
}), archivesController.permanentDelete);

// Cleanup old archives (admin only) - can be triggered manually or via cron
router.post('/cleanup', authorized, auditLog('cleanup', 'archive', 'Cleaned up old archives'), archivesController.cleanupOldArchives);

module.exports = router;