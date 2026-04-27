const appointmentsService = require("./appointments.service");

const getAllAppointments = async (req, res, next) => {
  try {
    const result = await appointmentsService.getAllAppointments();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getAppointmentsByDate = async (req, res, next) => {
  try {
    const result = await appointmentsService.getAppointmentsByDate(req.params.date);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const createAppointment = async (req, res, next) => {
  try {
    const result = await appointmentsService.createAppointment(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    const result = await appointmentsService.updateAppointment(req.params.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const deleteAppointment = async (req, res, next) => {
  try {
    await appointmentsService.deleteAppointment(req.params.id);
    res.status(200).json({ success: true, message: "Appointment deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllAppointments, getAppointmentsByDate, createAppointment, updateAppointment, deleteAppointment };