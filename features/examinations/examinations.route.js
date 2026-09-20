// C:\Users\HP\MediTrack\features\examinations\examinations.route.js

const express = require('express');
const router = express.Router();

const examinationsController = require('./examinations.controller');

const {
  authorized,
} = require('../../middleware/authorized');

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

    if (
      allowedRoles.includes(userRole)
    ) {
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

    if (
      allowedRoles.includes(userRole)
    ) {
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
// READ EXAMINATIONS
// =========================================================

router.get(
  '/',
  authorized,
  examinationsController.getAllExaminations
);

router.get(
  '/medical',
  authorized,
  examinationsController.getMedicalExaminations
);

router.get(
  '/dental',
  authorized,
  examinationsController.getDentalExaminations
);

// =========================================================
// SUBMIT / CREATE EXAMINATION
// =========================================================

router.post(
  '/medical',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Submit Medical Examination',
    'EXAMINATION',
    (req, res) =>
      res.locals.auditDescription ||
      'Submitted a medical examination.'
  ),
  examinationsController.createMedicalExamination
);

router.post(
  '/dental',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Submit Dental Examination',
    'EXAMINATION',
    (req, res) =>
      res.locals.auditDescription ||
      'Submitted a dental examination.'
  ),
  examinationsController.createDentalExamination
);

// =========================================================
// APPROVE EXAMINATION
// =========================================================

router.patch(
  '/medical/:id/approve',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Approve Medical Examination',
    'EXAMINATION',
    (req, res) =>
      res.locals.auditDescription ||
      `Approved medical examination with ID ${req.params.id}.`
  ),
  examinationsController.approveMedicalExamination
);

router.patch(
  '/dental/:id/approve',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Approve Dental Examination',
    'EXAMINATION',
    (req, res) =>
      res.locals.auditDescription ||
      `Approved dental examination with ID ${req.params.id}.`
  ),
  examinationsController.approveDentalExamination
);

// =========================================================
// ISSUE CERTIFICATE
// =========================================================

router.patch(
  '/medical/:id/certificate',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Issue Medical Certificate',
    'EXAMINATION',
    (req, res) =>
      res.locals.auditDescription ||
      `Issued a medical certificate for examination ${req.params.id}.`
  ),
  examinationsController.issueMedicalCertificate
);

router.patch(
  '/dental/:id/certificate',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Issue Dental Certificate',
    'EXAMINATION',
    (req, res) =>
      res.locals.auditDescription ||
      `Issued a dental certificate for examination ${req.params.id}.`
  ),
  examinationsController.issueDentalCertificate
);

// =========================================================
// UPDATE EXAMINATION
// =========================================================

router.put(
  '/medical/:id',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Update Medical Examination',
    'EXAMINATION',
    (req, res) =>
      res.locals.auditDescription ||
      `Updated medical examination with ID ${req.params.id}.`
  ),
  examinationsController.updateMedicalExamination
);

router.patch(
  '/medical/:id',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Update Medical Examination',
    'EXAMINATION',
    (req, res) =>
      res.locals.auditDescription ||
      `Updated medical examination with ID ${req.params.id}.`
  ),
  examinationsController.updateMedicalExamination
);

router.put(
  '/dental/:id',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Update Dental Examination',
    'EXAMINATION',
    (req, res) =>
      res.locals.auditDescription ||
      `Updated dental examination with ID ${req.params.id}.`
  ),
  examinationsController.updateDentalExamination
);

router.patch(
  '/dental/:id',
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    'Update Dental Examination',
    'EXAMINATION',
    (req, res) =>
      res.locals.auditDescription ||
      `Updated dental examination with ID ${req.params.id}.`
  ),
  examinationsController.updateDentalExamination
);

// =========================================================
// DELETE / ARCHIVE EXAMINATION
// =========================================================

router.delete(
  '/medical/:id',
  authorized,
  allowDynamicAdmin,
  auditLog(
    'Archive Medical Examination',
    'ARCHIVE',
    (req, res) =>
      res.locals.auditDescription ||
      `Archived medical examination with ID ${req.params.id}.`
  ),
  examinationsController.deleteMedicalExamination
);

router.delete(
  '/dental/:id',
  authorized,
  allowDynamicAdmin,
  auditLog(
    'Archive Dental Examination',
    'ARCHIVE',
    (req, res) =>
      res.locals.auditDescription ||
      `Archived dental examination with ID ${req.params.id}.`
  ),
  examinationsController.deleteDentalExamination
);

// =========================================================
// GET SINGLE EXAMINATION
// =========================================================
// Keep this AFTER all named/static routes.

router.get(
  '/medical/:id',
  authorized,
  examinationsController.getMedicalExaminationById
);

router.get(
  '/dental/:id',
  authorized,
  examinationsController.getDentalExaminationById
);

// Legacy fallback: searches medical first, then dental.
router.get(
  '/:id',
  authorized,
  examinationsController.getExaminationById
);

module.exports = router;
