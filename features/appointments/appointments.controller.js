// C:\Users\HP\MediTrack\controllers\appointments.controller.js
const appointmentsService = require("./appointments.service");

// ── NEW: Fetch appointments belonging strictly to the logged-in user ────────
const getMyAppointments = async (req, res, next) => {
  try {
    const authUid = req.user?.uid || req.headers['x-user-uid'];

    if (!authUid) {
      return res.status(401).json({ success: false, message: "User session identification missing." });
    }

    const result = await appointmentsService.getUserAppointments(authUid);
    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) {
    next(error);
  }
};

// ── Fetch ALL system appointments (For Clinical Admin Dashboards) ────────────
const getAllAppointments = async (req, res, next) => {
  try {
    const result = await appointmentsService.getAllAppointments();
    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) {
    next(error);
  }
};

// ── FIXED: Safely splits string parameters into distinct integers ────────────
const getAppointmentsByDate = async (req, res, next) => {
  try {
    const rawDate = req.params.date; // e.g., "2026-05-28" or "05-28-2026"
    const parts = rawDate.split('-');

    let year, month, day;
    if (parts[0].length === 4) {
      // Format: YYYY-MM-DD
      [year, month, day] = parts;
    } else {
      // Format: MM-DD-YYYY
      [month, day, year] = parts;
    }

    const result = await appointmentsService.getAppointmentsByDate(year, month, day);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ── FIXED: Passes session identifiers to bind table primary keys cleanly ────
const createAppointment = async (req, res, next) => {
  try {
    const authUid = req.user?.uid || req.headers['x-user-uid'];
    const appointmentData = { ...req.body };

    // Pass the user's secure Auth UID along so the service resolves the internal key
    if (authUid) {
      appointmentData.authUid = authUid;
    }

    const result = await appointmentsService.createAppointment(appointmentData);
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
    res.status(200).json({ success: true, message: "Appointment deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyAppointments, // 👈 Added to exports map
  getAllAppointments,
  getAppointmentsByDate,
  createAppointment,
  updateAppointment,
  deleteAppointment
};