const express = require("express");
const router = express.Router();
const appointmentsController = require("./appointments.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");
const { createAppointmentSchema, updateAppointmentSchema } = require("./appointments.validation");

router.get("/", authorized, appointmentsController.getAllAppointments);
router.get("/date/:date", authorized, appointmentsController.getAppointmentsByDate);
router.post("/", validateData(createAppointmentSchema), appointmentsController.createAppointment);
router.put("/:id", validateData(updateAppointmentSchema), appointmentsController.updateAppointment);
router.delete("/:id", authorized, appointmentsController.deleteAppointment);

module.exports = router;