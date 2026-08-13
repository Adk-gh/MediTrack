// C:\Users\HP\MediTrack\features\appointments\appointments.route.js

const express = require("express");
const router = express.Router();

const appointmentsController = require("./appointments.controller");
const { authorized } = require("../../middleware/authorized");
const { requireRole } = require("../../middleware/roleBasedAccess");

const validateData = require("../../validation/validate-data");

const {
  createAppointmentSchema,
  updateAppointmentSchema,
  bulkCreateAppointmentSchema
} = require("./appointments.validation");

const { auditLog } = require("../../middleware/auditLogger");

// ─────────────────────────────────────────────────────────────
// APPOINTMENT ROUTES
// ─────────────────────────────────────────────────────────────

// Get current user's appointments
// Available to authenticated users
router.get(
  "/my-appointments",
  authorized,
  appointmentsController.getMyAppointments
);

// Instructor's bulk appointment history
// Faculty only
router.get(
  "/bulk-history",
  authorized,
  requireRole("faculty"),
  appointmentsController.getBulkHistory
);

// Get appointments by date
// Available to authenticated users
router.get(
  "/date/:date",
  authorized,
  appointmentsController.getAppointmentsByDate
);

// Get all appointments
// Admin / faculty / staff
router.get(
  "/",
  authorized,
  requireRole(["sysadmin", "faculty", "staff"]),
  appointmentsController.getAllAppointments
);

// Create a normal appointment
// Authenticated users can request an appointment
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
// BULK APPOINTMENT
// ─────────────────────────────────────────────────────────────

// Faculty-only bulk appointment request
router.post(
  "/bulk",
  authorized,
  requireRole("faculty"),
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

// Update appointment
// Admin / faculty / staff
router.put(
  "/:id",
  authorized,
  requireRole(["sysadmin", "faculty", "staff"]),
  auditLog(
    "update",
    "appointment",
    (req) => `Updated appointment ID: ${req.params.id}`
  ),
  validateData(updateAppointmentSchema),
  appointmentsController.updateAppointment
);

// Archive appointment
// Admin / faculty / staff
router.delete(
  "/:id",
  authorized,
  requireRole(["sysadmin", "faculty", "staff"]),
  auditLog(
    "delete",
    "appointment",
    (req) => `Archived appointment ID: ${req.params.id}`
  ),
  appointmentsController.deleteAppointment
);

module.exports = router;