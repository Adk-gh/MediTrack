// C:\Users\HP\MediTrack\features\archives\archives.route.js

const express = require('express');

const router = express.Router();

const archivesController = require('./archives.controller');

const {
  authorized,
} = require('../../middleware/authorized');

const {
  auditLog,
} = require('../../middleware/auditLogger');

const {
  getSystemConfig,
} = require('../../services/systemConfig.service');

const supabase = require('../../configs/database');

// =========================================================
// HELPERS
// =========================================================

const normalizeRole = (role) => {
  return String(role || '')
    .trim()
    .toLowerCase();
};

const normalizeConfiguredRoles = (roles) => {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map(normalizeRole)
    .filter(Boolean);
};

const ALLOWED_ARCHIVE_TABLES = new Set([
  'users',
  'announcements',
  'appointments',
  'consultations',
  'medical_records',
  'dental_records',
  'notifications',
]);

const buildFullName = (record = {}) => {
  return [
    record.first_name || record.firstName,
    record.middle_name || record.middleName,
    record.last_name || record.lastName,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(' ');
};

const buildArchiveItemDetails = (
  tableName,
  record = {}
) => {
  const fullName = buildFullName(record);

  switch (tableName) {
    case 'users':
      return {
        recordName:
          fullName ||
          record.email ||
          'Unknown user',

        userName:
          fullName || null,

        universityId:
          record.university_id || null,

        email:
          record.email || null,

        role:
          record.role || null,
      };

    case 'appointments':
      return {
        recordName:
          record.patient_name ||
          fullName ||
          record.reason ||
          'Appointment',

        patientName:
          record.patient_name ||
          fullName ||
          null,

        serviceType:
          record.service_type ||
          record.serviceType ||
          record.type ||
          null,

        scheduleDate:
          record.schedule_date ||
          record.scheduleDate ||
          record.appointment_date ||
          null,

        scheduleTime:
          record.schedule_time ||
          record.scheduleTime ||
          record.appointment_time ||
          null,

        reason:
          record.reason || null,

        status:
          record.status || null,
      };

    case 'consultations':
      return {
        recordName:
          record.patient_name ||
          fullName ||
          'Consultation',

        patientName:
          record.patient_name ||
          fullName ||
          null,

        consultationType:
          record.consultation_type ||
          record.consultationType ||
          record.type ||
          null,

        status:
          record.status || null,
      };

    case 'medical_records':
      return {
        recordName:
          fullName ||
          record.patient_name ||
          'Medical Record',

        patientName:
          fullName ||
          record.patient_name ||
          null,

        universityId:
          record.university_id || null,

        examDate:
          record.exam_date ||
          record.examDate ||
          null,

        recordType: 'medical',
      };

    case 'dental_records':
      return {
        recordName:
          fullName ||
          record.patient_name ||
          'Dental Record',

        patientName:
          fullName ||
          record.patient_name ||
          null,

        universityId:
          record.university_id || null,

        examDate:
          record.exam_date ||
          record.examDate ||
          null,

        recordType: 'dental',
      };

    case 'announcements':
      return {
        recordName:
          record.title ||
          'Announcement',

        title:
          record.title || null,

        category:
          record.category || null,

        priority:
          record.priority || null,
      };

    case 'notifications':
      return {
        recordName:
          record.title ||
          'Notification',

        title:
          record.title || null,

        notificationType:
          record.type || null,

        recipientId:
          record.user_id || null,

        message:
          record.message || null,
      };

    default:
      return {
        recordName:
          record.title ||
          record.name ||
          fullName ||
          'Archived item',
      };
  }
};

const loadArchiveItemForAudit = async (
  req,
  res,
  next
) => {
  try {
    const tableName = String(
      req.query?.table || ''
    )
      .trim()
      .toLowerCase();

    if (!ALLOWED_ARCHIVE_TABLES.has(tableName)) {
      return next();
    }

    const requestedId =
      req.params.id;

    const idColumn =
      tableName === 'users'
        ? 'uid'
        : 'id';

    const {
      data: record,
      error,
    } = await supabase
      .from(tableName)
      .select('*')
      .eq(idColumn, requestedId)
      .maybeSingle();

    if (error) {
      console.warn(
        '[Archives Audit] Failed to retrieve item details:',
        error.message
      );

      return next();
    }

    if (record) {
      req.archiveAuditTarget = {
        tableName,
        itemId: requestedId,
        ...buildArchiveItemDetails(
          tableName,
          record
        ),
      };
    }

    return next();
  } catch (error) {
    console.warn(
      '[Archives Audit] Item-detail lookup failed:',
      error.message
    );

    return next();
  }
};

// =========================================================
// DYNAMIC ADMIN ROLE MIDDLEWARE
// =========================================================

const allowDynamicAdmin = async (
  req,
  res,
  next
) => {
  try {
    const userRole = normalizeRole(
      req.user?.role
    );

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. No role found.',
      });
    }

    const config = await getSystemConfig();

    const adminRoles =
      normalizeConfiguredRoles(
        config?.admin_roles
      );

    const allowedRoles = [
      ...new Set([
        ...adminRoles,
        'sysadmin',
      ]),
    ];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message:
        'Access denied. Admin privileges required.',
    });
  } catch (error) {
    console.error(
      '[DynamicRoleCheck] Admin verification failed:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Internal server error during role validation.',
    });
  }
};

// =========================================================
// AUTHENTICATION AND AUTHORIZATION
// =========================================================

router.use(
  authorized,
  allowDynamicAdmin
);

// =========================================================
// GET ARCHIVE STATISTICS
// =========================================================

router.get(
  '/stats',
  archivesController.getArchiveStats
);

// =========================================================
// CLEANUP OLD ARCHIVES
// =========================================================

router.post(
  '/cleanup',

  auditLog(
    'Cleanup Old Archives',
    'ARCHIVE',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        'Cleaned up expired archive entries.'
      );
    }
  ),

  archivesController.cleanupOldArchives
);

// =========================================================
// ARCHIVE AN ITEM
// =========================================================

router.post(
  '/',

  auditLog(
    'Archive Item',
    'ARCHIVE',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const archiveType =
        req.body?.type ||
        'unknown';

      const originalId =
        req.body?.originalId ||
        'unknown';

      return (
        `Archived ${archiveType} item ` +
        `with original ID ${originalId}.`
      );
    }
  ),

  archivesController.archiveItem
);

// =========================================================
// GET ALL ARCHIVES
// =========================================================

router.get(
  '/',
  archivesController.getArchives
);

// =========================================================
// RESTORE ARCHIVE
// =========================================================

router.post(
  '/:id/restore',

  loadArchiveItemForAudit,

  auditLog(
    'Restore Archive',
    'ARCHIVE',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const table =
        req.query?.table ||
        'unknown';

      const recordName =
        req.archiveAuditTarget?.recordName;

      return recordName
        ? (
            `Restored archived ${table} item ` +
            `"${recordName}" with ID ${req.params.id}.`
          )
        : (
            `Restored archived ${table} item ` +
            `with ID ${req.params.id}.`
          );
    }
  ),

  archivesController.restoreFromArchives
);

// =========================================================
// PERMANENTLY DELETE ARCHIVE
// =========================================================

router.delete(
  '/:id/delete',

  loadArchiveItemForAudit,

  auditLog(
    'Permanently Delete Archive',
    'ARCHIVE',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const table =
        req.query?.table ||
        'unknown';

      const recordName =
        req.archiveAuditTarget?.recordName;

      return recordName
        ? (
            `Permanently deleted archived ${table} item ` +
            `"${recordName}" with ID ${req.params.id}.`
          )
        : (
            `Permanently deleted archived ${table} item ` +
            `with ID ${req.params.id}.`
          );
    }
  ),

  archivesController.permanentDelete
);

// =========================================================
// GET ARCHIVE BY ID
// =========================================================

router.get(
  '/:id',
  archivesController.getArchiveById
);

module.exports = router;