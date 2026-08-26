// C:\Users\HP\MediTrack\features\appointments\appointments.route.js

const express = require('express');

const router = express.Router();

const appointmentsController = require('./appointments.controller');

const {
  authorized,
} = require('../../middleware/authorized');

const {
  getSystemConfig,
} = require('../../services/systemConfig.service');

const validateData = require('../../validation/validate-data');

const {
  createAppointmentSchema,
  updateAppointmentSchema,
  bulkCreateAppointmentSchema,
} = require('./appointments.validation');

const {
  auditLog,
} = require('../../middleware/auditLogger');

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

// Allows configured faculty and admin roles.
const allowDynamicFaculty = async (
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
        ...facultyRoles,
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
        'Access denied. Faculty privileges required.',
    });
  } catch (error) {
    console.error(
      '[DynamicRoleCheck] Faculty verification failed:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Internal server error during role validation.',
    });
  }
};

// Allows clinic, faculty, and admin roles.
const allowDynamicStaffAndFaculty = async (
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
        'Access denied. Faculty, Clinic Staff, or Admin privileges required.',
    });
  } catch (error) {
    console.error(
      '[DynamicRoleCheck] Staff/Faculty verification failed:',
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
// DYNAMIC PAYLOAD ROLE VALIDATION
// =========================================================

const validateDynamicRole = async (
  req,
  res,
  next
) => {
  try {
    const userType =
      req.body?.type ||
      req.body?.facultyRole ||
      req.body?.faculty_role;

    // Allow Zod or the service to handle missing required fields.
    if (!userType) {
      return next();
    }

    const config = await getSystemConfig();

    const validRoles = [
      'student',
      ...normalizeConfiguredRoles(
        config?.faculty_roles
      ),
      ...normalizeConfiguredRoles(
        config?.staff_roles
      ),
      ...normalizeConfiguredRoles(
        config?.clinic_roles
      ),
      ...normalizeConfiguredRoles(
        config?.admin_roles
      ),
    ];

    const uniqueValidRoles = [
      ...new Set(validRoles),
    ];

    const normalizedUserType =
      normalizeRole(userType);

    if (
      !uniqueValidRoles.includes(
        normalizedUserType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Invalid option: expected one of the configured ` +
          `system roles or 'student'. Received: '${userType}'`,
      });
    }

    return next();
  } catch (error) {
    console.error(
      '[DynamicRoleValidation] Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to validate user role configuration.',
    });
  }
};

// =========================================================
// CURRENT USER APPOINTMENTS
// =========================================================

router.get(
  '/my-appointments',
  authorized,
  appointmentsController.getMyAppointments
);

// =========================================================
// BULK APPOINTMENT HISTORY
// =========================================================

// Keep static routes before "/:id".
router.get(
  '/bulk-history',
  authorized,
  allowDynamicFaculty,
  appointmentsController.getBulkHistory
);

// =========================================================
// APPOINTMENTS BY DATE
// =========================================================

router.get(
  '/date/:date',
  authorized,
  appointmentsController.getAppointmentsByDate
);

// =========================================================
// CREATE BULK APPOINTMENTS
// =========================================================

router.post(
  '/bulk',
  authorized,
  allowDynamicStaffAndFaculty,
  validateData(bulkCreateAppointmentSchema),
  validateDynamicRole,

  auditLog(
    'Create Bulk Appointments',
    'APPOINTMENT',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const studentCount = Array.isArray(
        req.body?.studentIds
      )
        ? req.body.studentIds.length
        : 0;

      return (
        `Created a bulk appointment request for ` +
        `${studentCount} student${
          studentCount === 1 ? '' : 's'
        }.`
      );
    }
  ),

  appointmentsController.createBulkAppointment
);

// =========================================================
// GET ALL APPOINTMENTS
// =========================================================

router.get(
  '/',
  authorized,
  allowDynamicStaffAndFaculty,
  appointmentsController.getAllAppointments
);

// =========================================================
// CREATE NORMAL APPOINTMENT
// =========================================================

router.post(
  '/',
  authorized,
  validateData(createAppointmentSchema),
  validateDynamicRole,

  auditLog(
    'Create Appointment',
    'APPOINTMENT',
    (req, res) => {
      if (res.locals.auditDescription) {
        return res.locals.auditDescription;
      }

      const serviceType =
        req.body?.service_type ||
        req.body?.serviceType ||
        req.body?.type ||
        'general';

      return (
        `Created a new ${serviceType} appointment.`
      );
    }
  ),

  appointmentsController.createAppointment
);

// =========================================================
// UPDATE APPOINTMENT
// =========================================================

router.put(
  '/:id',
  authorized,
  allowDynamicStaffAndFaculty,
  validateData(updateAppointmentSchema),
  validateDynamicRole,

  auditLog(
    'Update Appointment',
    'APPOINTMENT',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Updated appointment with ID ${req.params.id}.`
      );
    }
  ),

  appointmentsController.updateAppointment
);

// Optional PATCH support for partial updates.
router.patch(
  '/:id',
  authorized,
  allowDynamicStaffAndFaculty,
  validateDynamicRole,

  auditLog(
    'Update Appointment',
    'APPOINTMENT',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Updated appointment with ID ${req.params.id}.`
      );
    }
  ),

  appointmentsController.updateAppointment
);

// =========================================================
// DELETE / ARCHIVE APPOINTMENT
// =========================================================

// This route archives the appointment instead of permanently
// deleting it, so the audit action and category use ARCHIVE.
router.delete(
  '/:id',
  authorized,
  allowDynamicStaffAndFaculty,

  auditLog(
    'Archive Appointment',
    'ARCHIVE',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Archived appointment with ID ${req.params.id}.`
      );
    }
  ),

  appointmentsController.archiveAppointment
);

module.exports = router;