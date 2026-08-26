// C:\Users\HP\MediTrack\features\consultations\consultations.route.js

const express = require('express');

const router = express.Router();

const consultationsController = require('./consultations.controller');

const {
  authorized: authorize,
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

const getAuditDescription = (
  fallbackDescription
) => {
  return (req, res) => {
    return (
      res.locals.auditDescription ||
      fallbackDescription
    );
  };
};

// =========================================================
// DYNAMIC ROLE MIDDLEWARES
// =========================================================

// Allows students, configured faculty/clinic/admin roles,
// and core clinical fallbacks.
const allowDynamicPatients = async (
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

    if (userRole === 'student') {
      return next();
    }

    const config = await getSystemConfig();

    const clinicRoles =
      normalizeConfiguredRoles(
        config?.clinic_roles
      );

    const facultyRoles =
      normalizeConfiguredRoles(
        config?.faculty_roles
      );

    const adminRoles =
      normalizeConfiguredRoles(
        config?.admin_roles
      );

    const allowedRoles = [
      ...new Set([
        ...clinicRoles,
        ...facultyRoles,
        ...adminRoles,
        'sysadmin',
        'doctor',
        'dentist',
        'nurse',
        'faculty',
      ]),
    ];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message:
        'Access denied. You do not have permission to perform this action.',
    });
  } catch (error) {
    console.error(
      '[DynamicRoleCheck] Failed to verify role:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Internal server error during role validation.',
    });
  }
};

// Allows configured clinic staff and admin roles.
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

// Allows configured admin roles only.
//
// Clinic staff should not be called "admin" unless you
// intentionally want doctors, dentists, and nurses to archive.
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
// AUTHENTICATION
// =========================================================

// Every consultation route below requires authentication.
router.use(authorize);

// =========================================================
// PRESENCE
// =========================================================

router.post(
  '/presence',
  consultationsController.setPresence
);

router.get(
  '/presence/online',
  consultationsController.getOnlineUsers
);

router.get(
  '/presence',
  consultationsController.getPresence
);

// =========================================================
// CONSULTATION MESSAGES
// =========================================================

// Keep message routes before general "/:id" routes for clarity.

router.get(
  '/:consultationId/messages',
  consultationsController.getMessages
);

router.post(
  '/:consultationId/messages',
  auditLog(
    'Send Consultation Message',
    'CONSULTATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Sent a message in consultation ${req.params.consultationId}.`
      );
    }
  ),
  consultationsController.sendMessage
);

router.post(
  '/:consultationId/messages/read',
  consultationsController.markMessagesAsRead
);

// =========================================================
// CONSULTATION LISTS
// =========================================================

router.get(
  '/',
  consultationsController.getAllConsultations
);

// Keep "/patient" before "/:id".
router.get(
  '/patient',
  consultationsController.getConsultationsByPatient
);

// =========================================================
// CREATE CONSULTATION
// =========================================================

router.post(
  '/',
  allowDynamicPatients,
  auditLog(
    'Create Consultation',
    'CONSULTATION',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const consultationType =
        req.body?.consultation_type ||
        req.body?.consultationType ||
        req.body?.type ||
        'Unknown';

      return (
        `Created a new ${consultationType} ` +
        'consultation.'
      );
    }
  ),
  consultationsController.createConsultation
);

// =========================================================
// REACTIVATE CONSULTATION
// =========================================================

router.put(
  '/:id/reactivate',
  allowDynamicPatients,
  auditLog(
    'Reactivate Consultation',
    'CONSULTATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Reactivated consultation with ID ${req.params.id}.`
      );
    }
  ),
  consultationsController.reactivateConsultation
);

// Optional PATCH alias for frontend compatibility.
router.patch(
  '/:id/reactivate',
  allowDynamicPatients,
  auditLog(
    'Reactivate Consultation',
    'CONSULTATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Reactivated consultation with ID ${req.params.id}.`
      );
    }
  ),
  consultationsController.reactivateConsultation
);

// =========================================================
// END CONSULTATION
// =========================================================

// Retained PUT support for existing frontend calls.
router.put(
  '/:id/end',
  allowDynamicClinicStaffs,
  auditLog(
    'Complete Consultation',
    'CONSULTATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Completed consultation with ID ${req.params.id}.`
      );
    }
  ),
  consultationsController.endConsultation
);

// Preferred endpoint because this is a partial state change.
router.patch(
  '/:id/end',
  allowDynamicClinicStaffs,
  auditLog(
    'Complete Consultation',
    'CONSULTATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Completed consultation with ID ${req.params.id}.`
      );
    }
  ),
  consultationsController.endConsultation
);

// =========================================================
// GET CONSULTATION BY ID
// =========================================================

router.get(
  '/:id',
  consultationsController.getConsultationById
);

// =========================================================
// UPDATE CONSULTATION
// =========================================================

router.put(
  '/:id',
  allowDynamicPatients,
  auditLog(
    'Update Consultation',
    'CONSULTATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Updated consultation with ID ${req.params.id}.`
      );
    }
  ),
  consultationsController.updateConsultation
);

// Optional PATCH support for partial updates.
router.patch(
  '/:id',
  allowDynamicPatients,
  auditLog(
    'Update Consultation',
    'CONSULTATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Updated consultation with ID ${req.params.id}.`
      );
    }
  ),
  consultationsController.updateConsultation
);

// =========================================================
// DELETE / ARCHIVE CONSULTATION
// =========================================================

router.delete(
  '/:id',
  allowDynamicAdmin,
  auditLog(
    'Archive Consultation',
    'ARCHIVE',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Archived consultation with ID ${req.params.id}.`
      );
    }
  ),
  consultationsController.deleteConsultation
);

module.exports = router;