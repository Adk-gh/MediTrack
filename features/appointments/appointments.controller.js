const appointmentsService = require("./appointments.service");

// ── Fetch appointments belonging strictly to the logged-in user ────────
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

// 🟢 NEW: Fetch bulk appointment history for a specific instructor
const getBulkHistory = async (req, res, next) => {
  try {
    const authUid = req.user?.uid || req.headers['x-user-uid'];

    if (!authUid) {
      return res.status(401).json({ success: false, message: "User session identification missing." });
    }

    const result = await appointmentsService.getBulkHistory(authUid);
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

// ── Safely splits string parameters into distinct integers ────────────
const getAppointmentsByDate = async (req, res, next) => {
  try {
    const rawDate = req.params.date;
    const parts = rawDate.split('-');

    let year, month, day;
    if (parts[0].length === 4) {
      [year, month, day] = parts;
    } else {
      [month, day, year] = parts;
    }

    const result = await appointmentsService.getAppointmentsByDate(year, month, day);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ── Passes session identifiers to bind table primary keys cleanly ────
const createAppointment = async (req, res, next) => {
  try {
    const authUid = req.user?.uid || req.headers['x-user-uid'];
    const appointmentData = { ...req.body };

    if (authUid) {
      appointmentData.authUid = authUid;
    }

    const result = await appointmentsService.createAppointment(appointmentData);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ── Faculty bulk appointment request ────────────────────────────────────
const createBulkAppointment = async (req, res, next) => {
  try {
    const authUid = req.user?.uid || req.headers['x-user-uid'];

    if (!authUid) {
      return res.status(401).json({ success: false, message: "User session identification missing." });
    }

    const result = await appointmentsService.createBulkAppointments({ ...req.body, authUid });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
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

// 🟢 MAKE SURE to export the new controller function!
module.exports = {
  getMyAppointments,
  getBulkHistory,
  getAllAppointments,
  getAppointmentsByDate,
  createAppointment,
  createBulkAppointment,
  updateAppointment,
  deleteAppointment
};