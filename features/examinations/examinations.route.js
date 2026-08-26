// C:\Users\HP\MediTrack\features\examinations\examinations.route.js

const express = require('express');

const router = express.Router();

const examinationsController = require('./examinations.controller');

const {
  authorized,
} = require('../../middleware/authorized');

const validateData = require('../../validation/validate-data');

const {
  createExaminationSchema,
  updateExaminationSchema,
} = require('./examinations.validation');

const {
  auditLog,
} = require('../../middleware/auditLogger');

const {
  getSystemConfig,
} = require('../../services/systemConfig.service');

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

// =========================================================
// DYNAMIC ROLE MIDDLEWARES
// =========================================================

// Allows Admin Roles + Clinic Staffs.
// Used for creating and updating examinations.
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

    const clinicRoles =
      normalizeConfiguredRoles(
        config?.clinic_roles
      );

    const adminRoles =
      normalizeConfiguredRoles(
        config?.admin_roles
      );

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

// Allows configured Admin Roles only.
// Used for deleting or archiving examinations.
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
// VIEW EXAMINATIONS
// =========================================================

// Get all examinations.
// Any authenticated user.
router.get(
  '/',
  authorized,
  examinationsController.getAllExaminations
);

// =========================================================
// SPECIFIC EXAMINATION TYPES
// =========================================================

// Keep static routes before "/:id".

// Get medical examinations.
router.get(
  '/medical',
  authorized,
  examinationsController.getMedicalExaminations
);

// Get dental examinations.
router.get(
  '/dental',
  authorized,
  examinationsController.getDentalExaminations
);

// =========================================================
// CREATE EXAMINATION
// =========================================================

// Admin + clinic staff.
router.post(
  '/',
  authorized,
  allowDynamicClinicStaffs,

  validateData(createExaminationSchema),

  auditLog(
    'Create Examination',
    'EXAMINATION',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const examinationType =
        req.body?.examination_type ||
        req.body?.examinationType ||
        req.body?.type ||
        'medical';

      return (
        `Created a new ${examinationType} ` +
        'examination.'
      );
    }
  ),

  examinationsController.createExamination
);

// =========================================================
// GET SINGLE EXAMINATION
// =========================================================

// Keep dynamic "/:id" after static routes.
router.get(
  '/:id',
  authorized,
  examinationsController.getExaminationById
);

// =========================================================
// UPDATE EXAMINATION
// =========================================================

// Admin + clinic staff.
router.put(
  '/:id',
  authorized,
  allowDynamicClinicStaffs,

  validateData(updateExaminationSchema),

  auditLog(
    'Update Examination',
    'EXAMINATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Updated examination with ID ${req.params.id}.`
      );
    }
  ),

  examinationsController.updateExamination
);

// Optional PATCH alias for partial updates.
router.patch(
  '/:id',
  authorized,
  allowDynamicClinicStaffs,

  auditLog(
    'Update Examination',
    'EXAMINATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Updated examination with ID ${req.params.id}.`
      );
    }
  ),

  examinationsController.updateExamination
);

// =========================================================
// DELETE / ARCHIVE EXAMINATION
// =========================================================

// Admin only.
//
// This assumes examinationsService.deleteExamination()
// archives the record. If it permanently deletes instead,
// rename the action to "Delete Examination" and change
// the category back to "EXAMINATION".
router.delete(
  '/:id',
  authorized,
  allowDynamicAdmin,

  auditLog(
    'Archive Examination',
    'ARCHIVE',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Archived examination with ID ${req.params.id}.`
      );
    }
  ),

  examinationsController.deleteExamination
);

module.exports = router;