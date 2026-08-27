// features/appointments/appointments.controller.js
const supabase = require('../../configs/database');

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

    console.log(
      '[CREATE APPOINTMENT CONTROLLER] Raw request body:',
      req.body
    );

    const appointmentData = {
      ...req.body,

      // Logged-in doctor/nurse/dentist
      authUid,

      // Selected patient internal users.id
      userId:
        req.body?.userId ||
        req.body?.user_id ||
        req.body?.patientUserId ||
        req.body?.patient_user_id ||
        null,

      // Selected patient's University ID
      patientId:
        req.body?.patientId ||
        req.body?.patient_id ||
        req.body?.universityId ||
        req.body?.university_id ||
        null,

      patientName:
        req.body?.patientName ||
        req.body?.patient_name ||
        req.body?.name ||
        null,

      serviceType:
        req.body?.serviceType ||
        req.body?.service_type ||
        null,

      reason:
        req.body?.reason ||
        '',

      year:
        req.body?.year !== undefined
          ? Number(req.body.year)
          : undefined,

      month:
        req.body?.month !== undefined
          ? Number(req.body.month)
          : undefined,

      day:
        req.body?.day !== undefined
          ? Number(req.body.day)
          : undefined,

      time:
        req.body?.time ||
        req.body?.scheduleTime ||
        req.body?.schedule_time ||
        null,

      bookedBy:
        req.body?.bookedBy ||
        req.body?.booked_by ||
        resolveActorName(req),
    };

    console.log(
      '[CREATE APPOINTMENT CONTROLLER] Normalized data:',
      appointmentData
    );

    if (!appointmentData.userId && !appointmentData.patientId) {
      return res.status(422).json({
        success: false,
        message:
          'Selected patient user ID or University ID is required.',
      });
    }

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

        // Selected patient's ID, not requester auth UID
        userId:
          result?.user_id ||
          appointmentData.userId ||
          null,

        requesterUid: authUid,

        serviceType:
          result?.service_type ||
          appointmentData.serviceType ||
          null,

        scheduleDate:
          result?.year && result?.month && result?.day
            ? `${result.year}-${String(result.month).padStart(
                2,
                '0'
              )}-${String(result.day).padStart(2, '0')}`
            : appointmentData.year &&
                appointmentData.month &&
                appointmentData.day
              ? `${appointmentData.year}-${String(
                  appointmentData.month
                ).padStart(2, '0')}-${String(
                  appointmentData.day
                ).padStart(2, '0')}`
              : null,

        scheduleTime:
          result?.time ||
          appointmentData.time ||
          null,
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Appointment created successfully.',
      data: result,
    });
  } catch (error) {
    console.error(
      '[CREATE APPOINTMENT CONTROLLER ERROR]',
      {
        message: error.message,
        status: error.status,
        statusCode: error.statusCode,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack,
      }
    );

    return res
      .status(error.status || error.statusCode || 500)
      .json({
        success: false,
        message:
          error.message ||
          'Could not create the appointment.',
        error: error.message || null,
        code: error.code || null,
        details: error.details || null,
        hint: error.hint || null,
      });
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

    return res.status(200).json({
      success: true,
      message: 'Appointment updated successfully.',
      data: result,
    });
  } catch (error) {
    console.error(
      '[UPDATE APPOINTMENT CONTROLLER ERROR]',
      error
    );

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