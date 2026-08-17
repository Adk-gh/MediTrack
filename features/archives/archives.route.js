// C:\Users\HP\MediTrack\features\archives\archives.route.js

const express = require('express');
const router = express.Router();

const archivesController = require('./archives.controller');
const { authorized } = require('../../middleware/authorized');
const { auditLog } = require('../../middleware/auditLogger');
const { getSystemConfig } = require('../../services/systemConfig.service');
const supabase = require('../../configs/database');

// =========================================================
// DYNAMIC ROLE MIDDLEWARES
// =========================================================

// Allows Admin Roles ONLY (for archives management)
const allowDynamicAdmin = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!userRole) {
      return res.status(403).json({ message: "Access denied. No role found." });
    }

    const config = await getSystemConfig();

    const adminRoles = (config.admin_roles || []).map(r => r.toLowerCase());

    // Safety net: Keep sysadmin and core clinical roles as hardcoded fallbacks
    const allowedRoles = [
      ...adminRoles,
      "sysadmin",
      "doctor",
      "dentist",
      "nurse"
    ];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      message: "Access denied. Admin privileges required."
    });
  } catch (error) {
    console.error("[DynamicRoleCheck] Admin verification failed:", error);
    return res.status(500).json({ message: "Internal server error during role validation." });
  }
};

// ---------------------------------------------------------
// ADMIN-ONLY ARCHIVE ROUTES
// ---------------------------------------------------------

// Archive an item
router.post(
  '/',
  authorized,
  allowDynamicAdmin,
  auditLog(
    'create',
    'archive',
    (req) => `Archived item: ${req.body.type || 'unknown'}`
  ),
  archivesController.archiveItem
);

// Get all archives
router.get(
  '/',
  authorized,
  allowDynamicAdmin,
  archivesController.getArchives
);

// Get archive statistics
router.get(
  '/stats',
  authorized,
  allowDynamicAdmin,
  archivesController.getArchiveStats
);

// Get archive by ID
router.get(
  '/:id',
  authorized,
  allowDynamicAdmin,
  archivesController.getArchiveById
);

// ---------------------------------------------------------
// RESTORE ARCHIVE
// ---------------------------------------------------------

router.post(
  '/:id/restore',
  authorized,
  allowDynamicAdmin,
  async (req, res, next) => {
    let itemDetails = '';
    const { table } = req.query;

    if (table) {
      const idColumn = table === 'users' ? 'uid' : 'id';

      try {
        let selectFields = '*';

        if (table === 'users') {
          selectFields =
            'first_name, middle_name, last_name, university_id';
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
            itemDetails =
              `${item.first_name || ''} ${item.middle_name || ''} ${item.last_name || ''}`
                .trim()
                .replace(/\s+/g, ' ') +
              (item.university_id
                ? ` (${item.university_id})`
                : '');
          } else if (table === 'announcements') {
            itemDetails = item.title || '';
          } else if (table === 'consultations') {
            itemDetails =
              `${item.patient_name || ''} (${item.consultation_type || 'consultation'})`
                .trim();
          } else if (table === 'appointments') {
            itemDetails =
              `${item.patient_name || ''} - ${item.service_type || ''}`
                .trim();
          }
        }
      } catch (e) {
        // Keep archive restore working even if audit details cannot be fetched
      }
    }

    req.itemDetails = itemDetails;
    next();
  },
  auditLog('restore', 'archive', (req) => {
    const details = req.itemDetails
      ? ` - ${req.itemDetails}`
      : '';

    return `Restored archive ID: ${req.params.id}${details}`;
  }),
  archivesController.restoreFromArchives
);

// ---------------------------------------------------------
// PERMANENT DELETE
// ---------------------------------------------------------

router.delete(
  '/:id/delete',
  authorized,
  allowDynamicAdmin,
  async (req, res, next) => {
    let itemDetails = '';
    const { table } = req.query;

    if (table) {
      const idColumn = table === 'users' ? 'uid' : 'id';

      try {
        let selectFields = '*';

        if (table === 'users') {
          selectFields =
            'first_name, middle_name, last_name, university_id';
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
            itemDetails =
              `${item.first_name || ''} ${item.middle_name || ''} ${item.last_name || ''}`
                .trim()
                .replace(/\s+/g, ' ') +
              (item.university_id
                ? ` (${item.university_id})`
                : '');
          } else if (table === 'announcements') {
            itemDetails = item.title || '';
          }
        }
      } catch (e) {
        // Keep deletion working even if audit details cannot be fetched
      }
    }

    req.itemDetails = itemDetails;
    next();
  },
  auditLog('delete', 'archive', (req) => {
    const details = req.itemDetails
      ? ` - ${req.itemDetails}`
      : '';

    return `Permanently deleted archive ID: ${req.params.id}${details}`;
  }),
  archivesController.permanentDelete
);

// ---------------------------------------------------------
// CLEANUP OLD ARCHIVES
// ---------------------------------------------------------

router.post(
  '/cleanup',
  authorized,
  allowDynamicAdmin,
  auditLog(
    'cleanup',
    'archive',
    'Cleaned up old archives'
  ),
  archivesController.cleanupOldArchives
);

module.exports = router;