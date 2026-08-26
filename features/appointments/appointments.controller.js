// features/appointments/appointments.controller.js

const appointmentsService = require('./appointments.service');

// ============================================================
// HELPERS
// ============================================================

const resolveAuthUid = (req) => {
  return req.user?.uid || req.user?.id || req.headers['x-user-uid'] || null;
};

const resolveActorName = (req) => {
  const fullName = [
    req.user?.first_name || req.user?.firstName,
    req.user?.middle_name || req.user?.middleName,
    req.user?.last_name || req.user?.lastName,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(' ');

  return fullName || req.user?.email || 'System User';
};

const setAuditData = (res, description, details = {}) => {
  res.locals.auditDescription = description;
  res.locals.auditDetails = details;
};

// ============================================================
// FETCH USER APPOINTMENTS
// ============================================================

const getMyAppointments = async (req, res, next) => {
  try {
    const authUid = resolveAuthUid(req);

    if (!authUid) {
      return res.status(401).json({
        success: false,
        message: 'User session identification missing.',
      });
    }

    const result =
      await appointmentsService.getUserAppointments(authUid);

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// FETCH BULK APPOINTMENT HISTORY
// ============================================================

const getBulkHistory = async (req, res, next) => {
  try {
    const authUid = resolveAuthUid(req);

    if (!authUid) {
      return res.status(401).json({
        success: false,
        message: 'User session identification missing.',
      });
    }

    const result =
      await appointmentsService.getBulkHistory(authUid);

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// FETCH ALL APPOINTMENTS
// ============================================================

const getAllAppointments = async (req, res, next) => {
  try {
    const result =
      await appointmentsService.getAllAppointments();

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// FETCH APPOINTMENTS BY DATE
// ============================================================

const getAppointmentsByDate = async (req, res, next) => {
  try {
    const rawDate = req.params.date;

    if (!rawDate) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date is required.',
      });
    }

    const parts = rawDate.split('-');

    if (parts.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format.',
      });
    }

    let year;
    let month;
    let day;

    if (parts[0].length === 4) {
      [year, month, day] = parts;
    } else {
      [month, day, year] = parts;
    }

    const result =
      await appointmentsService.getAppointmentsByDate(
        year,
        month,
        day
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE APPOINTMENT
// ============================================================

const createAppointment = async (req, res, next) => {
  try {
    const authUid = resolveAuthUid(req);

    if (!authUid) {
      return res.status(401).json({
        success: false,
        message: 'User session identification missing.',
      });
    }

    const appointmentData = {
      ...req.body,
      authUid,
    };

    const result =
      await appointmentsService.createAppointment(
        appointmentData
      );

    const appointmentId =
      result?.id ||
      result?.appointment?.id ||
      result?.data?.id ||
      null;

    setAuditData(
      res,
      appointmentId
        ? `Created appointment with ID ${appointmentId}.`
        : 'Created a new appointment.',
      {
        operation: 'create_appointment',
        appointmentId,
        userId: authUid,
        serviceType:
          result?.service_type ||
          result?.serviceType ||
          req.body?.service_type ||
          req.body?.serviceType ||
          null,
        scheduleDate:
          result?.schedule_date ||
          result?.scheduleDate ||
          req.body?.schedule_date ||
          req.body?.scheduleDate ||
          null,
        scheduleTime:
          result?.schedule_time ||
          result?.scheduleTime ||
          req.body?.schedule_time ||
          req.body?.scheduleTime ||
          null,
      }
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE BULK APPOINTMENTS
// ============================================================

const createBulkAppointment = async (req, res, next) => {
  try {
    const authUid = resolveAuthUid(req);

    if (!authUid) {
      return res.status(401).json({
        success: false,
        message: 'User session identification missing.',
      });
    }

    const result =
      await appointmentsService.createBulkAppointments({
        ...req.body,
        authUid,
      });

    const appointments =
      result?.appointments ||
      result?.data ||
      (Array.isArray(result) ? result : []);

    const createdCount = Array.isArray(appointments)
      ? appointments.length
      : result?.count || 0;

    setAuditData(
      res,
      `Created ${createdCount} bulk appointment${
        createdCount === 1 ? '' : 's'
      }.`,
      {
        operation: 'create_bulk_appointments',
        createdCount,
        userId: authUid,
        appointmentIds: Array.isArray(appointments)
          ? appointments
              .map((appointment) => appointment?.id)
              .filter(Boolean)
          : [],
      }
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

// ============================================================
// UPDATE APPOINTMENT
// ============================================================

const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required.',
      });
    }

    const result =
      await appointmentsService.updateAppointment(
        id,
        req.body
      );

    const resolvedAppointmentId =
      result?.id || id;

    setAuditData(
      res,
      `Updated appointment with ID ${resolvedAppointmentId}.`,
      {
        operation: 'update_appointment',
        appointmentId: resolvedAppointmentId,
        updatedFields: Object.keys(req.body || {}),
        status:
          result?.status ||
          req.body?.status ||
          null,
      }
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE APPOINTMENT
// ============================================================

const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required.',
      });
    }

    const result =
      await appointmentsService.deleteAppointment(id);

    const resolvedAppointmentId =
      result?.id || id;

    setAuditData(
      res,
      `Deleted appointment with ID ${resolvedAppointmentId}.`,
      {
        operation: 'delete_appointment',
        appointmentId: resolvedAppointmentId,
        deletedBy: resolveActorName(req),
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully',
      data: result || {
        id: resolvedAppointmentId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ARCHIVE APPOINTMENT
// ============================================================

const archiveAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required.',
      });
    }

    const result =
      await appointmentsService.archiveAppointment(id);

    const appointmentId =
      result?.id ||
      result?.appointment?.id ||
      id;

    const archiveId =
      result?.archiveId ||
      result?.archive_id ||
      result?.archive?.id ||
      null;

    setAuditData(
      res,
      archiveId
        ? `Archived appointment with ID ${appointmentId} under archive ID ${archiveId}.`
        : `Archived appointment with ID ${appointmentId}.`,
      {
        operation: 'archive_appointment',
        appointmentId,
        archiveId,
        tableName: 'appointments',
        archivedBy: resolveActorName(req),
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment archived successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getMyAppointments,
  getBulkHistory,
  getAllAppointments,
  getAppointmentsByDate,
  archiveAppointment,
  createAppointment,
  createBulkAppointment,
  updateAppointment,
  deleteAppointment,
};