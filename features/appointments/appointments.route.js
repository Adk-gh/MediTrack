const express = require("express");
const router = express.Router();
const appointmentsController = require("./appointments.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");
const { createAppointmentSchema, updateAppointmentSchema } = require("./appointments.validation");

// ── IMPORTANT: specific routes MUST come before param routes (/:id) ──────────
router.get("/my-appointments", authorized, appointmentsController.getMyAppointments); // 👈 moved up
router.get("/date/:date",      authorized, appointmentsController.getAppointmentsByDate);
router.get("/",                authorized, appointmentsController.getAllAppointments);

router.post(  "/",    validateData(createAppointmentSchema), appointmentsController.createAppointment);
router.put(   "/:id", authorized, validateData(updateAppointmentSchema), appointmentsController.updateAppointment);
router.delete("/:id", authorized, appointmentsController.deleteAppointment);

module.exports = router;