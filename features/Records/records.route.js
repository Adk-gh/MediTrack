// C:\Users\HP\MediTrack\features\Records\records.route.js

const express = require('express');

const router = express.Router();

const recordsController = require('./records.controller');

const { authorized } = require('../../middleware/authorized');

const validateData = require('../../validation/validate-data');

const {
  createRecordSchema,
  updateRecordSchema,
} = require('./records.validation');

const {
  getSystemConfig,
} = require('../../services/systemConfig.service');

const {
  auditLog,
} = require('../../middleware/auditLogger');

// ============================================================
// HELPERS
// ============================================================

const normalizeRole = (role) => {
  return String(role || '')
    .trim()
    .toLowerCase();
};

const getAuditDescription = (fallbackDescription) => {
  return (req, res) => {
    return (
      res.locals.auditDescription ||
      fallbackDescription
    );
  };
};

// ============================================================
// DYNAMIC ROLE MIDDLEWARES
// ============================================================

// Allows Admin Roles + Clinic Staffs.
// Used for creating/updating records.
const allowDynamicClinicStaffs = async (
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

    const clinicRoles = Array.isArray(
      config?.clinic_roles
    )
      ? config.clinic_roles.map(normalizeRole)
      : [];

    const adminRoles = Array.isArray(
      config?.admin_roles
    )
      ? config.admin_roles.map(normalizeRole)
      : [];

    const allowedRoles = [
      ...new Set([
        ...clinicRoles,
        ...adminRoles,
        'sysadmin',
        'doctor',
        'dentist',
        'nurse',
      ]),
    ];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message:
        'Access denied. Clinic staff or Admin privileges required.',
    });
  } catch (error) {
    console.error(
      '[DynamicRoleCheck] Clinic staffs verification failed:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Internal server error during role validation.',
    });
  }
};

// ============================================================
// ADMIN ONLY
// ============================================================

// Allows dynamically configured admin roles only.
// Used for deleting and archiving records.
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

    const adminRoles = Array.isArray(
      config?.admin_roles
    )
      ? config.admin_roles.map(normalizeRole)
      : [];

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

// ============================================================
// VIEW RECORDS
// ============================================================

// Get all records.
// Any authenticated user.
router.get(
  '/',
  authorized,
  recordsController.getAllRecords
);

// ============================================================
// CERTIFICATE REQUEST
// ============================================================

// Ordinary authenticated users must be able to request
// a certificate for a record they own.
router.post(
  '/:id/certificate-request',
  authorized,

  auditLog(
    'Request Certificate',
    'CERTIFICATE',
    (req, res) =>
      res.locals.auditDescription ||
      `Submitted a certificate request for record ${req.params.id}.`
  ),

  recordsController.requestCertificate
);

// ============================================================
// AUTO-ARCHIVE
// ============================================================

// IMPORTANT:
// Keep this route before "/:id" so Express does not treat
// "auto-archive" as a record ID.
router.post(
  '/auto-archive',
  authorized,
  allowDynamicAdmin,

  auditLog(
    'Auto Archive Records',
    'ARCHIVE',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const isDryRun =
        req.query?.dryRun === 'true';

      return isDryRun
        ? 'Performed a dry run for automatic record archiving.'
        : 'Automatically archived eligible old records.';
    }
  ),

  recordsController.autoArchiveRecords
);

// ============================================================
// ARCHIVE MEDICAL RECORD
// ============================================================

// IMPORTANT:
// Keep this route before "/:id".
router.delete(
  '/medical/:id',
  authorized,
  allowDynamicAdmin,

  auditLog(
    'Archive Medical Record',
    'ARCHIVE',
    (req, res) =>
      res.locals.auditDescription ||
      `Archived medical record with ID ${req.params.id}.`
  ),

  recordsController.archiveMedicalRecord
);

// ============================================================
// ARCHIVE DENTAL RECORD
// ============================================================

// IMPORTANT:
// Keep this route before "/:id".
router.delete(
  '/dental/:id',
  authorized,
  allowDynamicAdmin,

  auditLog(
    'Archive Dental Record',
    'ARCHIVE',
    (req, res) =>
      res.locals.auditDescription ||
      `Archived dental record with ID ${req.params.id}.`
  ),

  recordsController.archiveDentalRecord
);

// ============================================================
// GET SPECIFIC RECORD
// ============================================================

// Keep this dynamic route after all named routes.
router.get(
  '/:id',
  authorized,
  recordsController.getRecordById
);

// ============================================================
// CREATE RECORD
// ============================================================

// Admin + clinic staff.
router.post(
  '/',
  authorized,
  allowDynamicClinicStaffs,
  validateData(createRecordSchema),

  auditLog(
    'Create Record',
    'RECORD',
    getAuditDescription(
      'Created a new health record.'
    )
  ),

  recordsController.createRecord
);
// ============================================================
// UPDATE RECORD STATUS
// ============================================================
router.put(
  '/:recordType/:recordId/status',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Update Record Status',
    'RECORD',
    (req, res) =>
      res.locals.auditDescription ||
      `Updated ${req.params.recordType} record status for ID ${req.params.recordId}.`
  ),
  recordsController.updateRecordStatus
);

// ============================================================
// UPDATE TYPED RECORD
// ============================================================
router.put(
  '/:recordType/:recordId',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Update Record',
    'RECORD',
    (req, res) =>
      res.locals.auditDescription ||
      `Updated ${req.params.recordType} record with ID ${req.params.recordId}.`
  ),
  recordsController.updateRecord
);

// ============================================================
// UPDATE RECORD - OLD ROUTE
// ============================================================
router.put(
  '/:id',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Update Record',
    'RECORD',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const recordType =
        req.body?.recordType ||
        req.body?.record_type ||
        'health';

      return (
        `Updated ${recordType} record ` +
        `with ID ${req.params.id}.`
      );
    }
  ),
  recordsController.updateRecord
);

// ============================================================
// DELETE / ARCHIVE USER RECORD
// ============================================================

// Admin only.
router.delete(
  '/:id',
  authorized,
  allowDynamicAdmin,

  auditLog(
    'Archive User Record',
    'ARCHIVE',
    (req, res) =>
      res.locals.auditDescription ||
      `Archived user account and health record with ID ${req.params.id}.`
  ),

  recordsController.deleteRecord
);

module.exports = router;