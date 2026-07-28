const express = require("express");
const router = express.Router();
const appointmentsController = require("./appointments.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");
const { createAppointmentSchema, updateAppointmentSchema } = require("./appointments.validation");
const { auditLog } = require('../../middleware/auditLogger');

// ── IMPORTANT: specific routes MUST come before param routes (/:id) ──────────
router.get("/my-appointments", authorized, appointmentsController.getMyAppointments); // 👈 moved up
router.get("/date/:date",      authorized, appointmentsController.getAppointmentsByDate);
router.get("/",                authorized, appointmentsController.getAllAppointments);

router.post(  "/",    auditLog('create', 'appointment', (req) => `Created new appointment`), validateData(createAppointmentSchema), appointmentsController.createAppointment);
router.put(   "/:id", authorized, auditLog('update', 'appointment', (req) => `Updated appointment ID: ${req.params.id}`), validateData(updateAppointmentSchema), appointmentsController.updateAppointment);
router.delete("/:id", authorized, auditLog('delete', 'appointment', (req) => `Archived appointment ID: ${req.params.id}`), appointmentsController.deleteAppointment);

module.exports = router;