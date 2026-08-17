// C:\Users\HP\MediTrack\features\appointments\appointments.route.js

const express = require("express");
const router = express.Router();

const appointmentsController = require("./appointments.controller");
const { authorized } = require("../../middleware/authorized");
const { getSystemConfig } = require("../../services/systemConfig.service");

const validateData = require("../../validation/validate-data");

const {
  createAppointmentSchema,
  updateAppointmentSchema,
  bulkCreateAppointmentSchema
} = require("./appointments.validation");

const { auditLog } = require("../../middleware/auditLogger");

// =========================================================
// DYNAMIC ROLE MIDDLEWARES
// =========================================================

// Allows Faculty Roles (Dynamic from system_config) + Sysadmin
const allowDynamicFaculty = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!userRole) {
      return res.status(403).json({ message: "Access denied. No role found." });
    }

    const config = await getSystemConfig();
    const facultyRoles = (config.faculty_roles || []).map(r => r.toLowerCase());
    const adminRoles = (config.admin_roles || []).map(r => r.toLowerCase());

    const allowedRoles = [...facultyRoles, ...adminRoles, "sysadmin"];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      message: "Access denied. Faculty privileges required."
    });
  } catch (error) {
    console.error("[DynamicRoleCheck] Faculty verification failed:", error);
    return res.status(500).json({ message: "Internal server error during role validation." });
  }
};

// Allows Admin Roles, Clinic Staffs, AND Faculty Roles (Fully Dynamic)
const allowDynamicStaffAndFaculty = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!userRole) {
      return res.status(403).json({ message: "Access denied. No role found." });
    }

    const config = await getSystemConfig();

    const clinicRoles = (config.clinic_roles || []).map(r => r.toLowerCase());
    const facultyRoles = (config.faculty_roles || []).map(r => r.toLowerCase());
    const adminRoles = (config.admin_roles || []).map(r => r.toLowerCase());

    // Master safety net fallback for core roles
    const allowedRoles = [
      ...clinicRoles,
      ...facultyRoles,
      ...adminRoles,
      "sysadmin",
      "doctor",
      "dentist",
      "nurse",
      "faculty"
    ];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      message: "Access denied. Faculty, Clinic Staff, or Admin privileges required."
    });
  } catch (error) {
    console.error("[DynamicRoleCheck] Staff/Faculty verification failed:", error);
    return res.status(500).json({ message: "Internal server error during role validation." });
  }
};

// ─────────────────────────────────────────────────────────────
// APPOINTMENT ROUTES
// ─────────────────────────────────────────────────────────────

// Get current user's appointments
router.get(
  "/my-appointments",
  authorized,
  appointmentsController.getMyAppointments
);

// Get appointments by date
router.get(
  "/date/:date",
  authorized,
  appointmentsController.getAppointmentsByDate
);

// Get all appointments
router.get(
  "/",
  authorized,
  allowDynamicStaffAndFaculty,
  appointmentsController.getAllAppointments
);

// Create a normal appointment
router.post(
  "/",
  authorized,
  auditLog(
    "create",
    "appointment",
    () => `Created new appointment`
  ),
  validateData(createAppointmentSchema),
  appointmentsController.createAppointment
);

// ─────────────────────────────────────────────────────────────
// BULK APPOINTMENT ROUTES
// ─────────────────────────────────────────────────────────────

// Instructor's bulk appointment history
router.get(
  "/bulk-history",
  authorized,
  allowDynamicFaculty,
  appointmentsController.getBulkHistory
);

// Faculty / Staff bulk appointment request
router.post(
  "/bulk",
  authorized,
  allowDynamicStaffAndFaculty,
  auditLog(
    "create",
    "appointment",
    (req) =>
      `Created bulk appointment for ${
        req.body?.studentIds?.length || 0
      } students`
  ),
  validateData(bulkCreateAppointmentSchema),
  appointmentsController.createBulkAppointment
);

// ─────────────────────────────────────────────────────────────
// UPDATE / DELETE
// ─────────────────────────────────────────────────────────────

router.put(
  "/:id",
  authorized,
  allowDynamicStaffAndFaculty,
  auditLog(
    "update",
    "appointment",
    (req) => `Updated appointment ID: ${req.params.id}`
  ),
  validateData(updateAppointmentSchema),
  appointmentsController.updateAppointment
);

router.delete(
  "/:id",
  authorized,
  allowDynamicStaffAndFaculty,
  auditLog(
    "delete",
    "appointment",
    (req) => `Archived appointment ID: ${req.params.id}`
  ),
  appointmentsController.deleteAppointment
);

module.exports = router;