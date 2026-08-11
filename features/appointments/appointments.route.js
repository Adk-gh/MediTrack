const express = require("express");
const router = express.Router();
const appointmentsController = require("./appointments.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");
const { createAppointmentSchema, updateAppointmentSchema, bulkCreateAppointmentSchema } = require("./appointments.validation");
const { auditLog } = require('../../middleware/auditLogger');

// ── IMPORTANT: specific routes MUST come before param routes (/:id) ──────────
router.get("/my-appointments", authorized, appointmentsController.getMyAppointments);

// 🟢 NEW: Route for fetching an instructor's bulk appointment history
router.get("/bulk-history", authorized, appointmentsController.getBulkHistory);

router.get("/date/:date",      authorized, appointmentsController.getAppointmentsByDate);
router.get("/",                authorized, appointmentsController.getAllAppointments);

router.post(  "/",     auditLog('create', 'appointment', (req) => `Created new appointment`), validateData(createAppointmentSchema), appointmentsController.createAppointment);

// ── Faculty-only bulk appointment request (CSV of University IDs) ───────
router.post(
  "/bulk",
  authorized,
  auditLog('create', 'appointment', (req) => `Created bulk appointment for ${req.body?.studentIds?.length || 0} students`),
  validateData(bulkCreateAppointmentSchema),
  appointmentsController.createBulkAppointment
);

router.put(   "/:id", authorized, auditLog('update', 'appointment', (req) => `Updated appointment ID: ${req.params.id}`), validateData(updateAppointmentSchema), appointmentsController.updateAppointment);
router.delete("/:id", authorized, auditLog('delete', 'appointment', (req) => `Archived appointment ID: ${req.params.id}`), appointmentsController.deleteAppointment);

module.exports = router;