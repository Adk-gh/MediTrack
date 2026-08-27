//C:\Users\HP\MediTrack\features\appointments\appointments.service.js
const crypto = require('crypto');
const supabase = require('../../configs/database');
const notificationsService = require('../notifications/notifications.service');

// Helper to determine recipient roles based on appointment service or reason
const getTargetRolesForAppointment = (serviceType, reason) => {
  const text = `${serviceType || ''} ${reason || ''}`.toLowerCase();
  if (text.includes('dent') || text.includes('oral') || text.includes('tooth') || text.includes('teeth')) {
    return ['dentist', 'sysadmin'];
  }
  return ['doctor', 'nurse', 'sysadmin'];
};

// ============================================================
// STATUS NOTIFICATION COPY
// ============================================================
const buildStatusNotification = (status) => {
  switch (status) {
    case 'approved':
      return {
        title: 'Appointment Approved!',
        message: 'Great news! Your appointment has been approved by the clinic staff.',
      };
    case 'rejected':
      return {
        title: 'Appointment Rejected',
        message: 'Your appointment request has been declined. Please consult clinic staff.',
      };
    case 'done':
    case 'completed':
      return {
        title: 'Appointment Completed',
        message: 'Your appointment has been marked as completed.',
      };
    case 'missed':
      return {
        title: 'Appointment Missed',
        message: 'You missed your scheduled appointment window.',
      };
    default:
      return {
        title: 'Appointment Status Updated',
        message: `Your appointment status has been updated to: ${status}`,
      };
  }
};

// Formats a date/time triplet for human-readable notification copy
const formatAppointmentDateTime = ({ year, month, day, time }) => {
  const datePart = [month, day, year].filter((v) => v !== undefined && v !== null && v !== '').join('/');
  return time ? `${datePart} ${time}` : datePart;
};

exports.getUserAppointments = async (authUid) => {
  if (!authUid) throw new Error('Unauthorized session.');

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, uid')
    .eq('uid', authUid)
    .single();

  const internalUserId = userProfile?.id;

  if (!internalUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', internalUserId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

exports.getBulkHistory = async (authUid) => {
  if (!authUid) throw new Error('Unauthorized session.');

  const { data: userProfile } = await supabase
    .from('users')
    .select('id')
    .eq('uid', authUid)
    .single();

  const internalUserId = userProfile?.id;
  if (!internalUserId) return [];

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      users ( university_id )
    `)
    .eq('booked_by_id', internalUserId)
    .not('batch_id', 'is', null)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

exports.getAllAppointments = async () => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

exports.getAppointmentsByDate = async (year, month, day) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('year', parseInt(year, 10))
    .eq('month', parseInt(month, 10))
    .eq('day', parseInt(day, 10))
    .eq('is_archived', false);

  if (error) throw error;
  return data;
};

exports.createAppointment = async (data) => {
  const requesterAuthUid = data.authUid;

  const selectedPatientId =
    data.userId ||
    data.user_id ||
    data.patientUserId ||
    data.patient_user_id ||
    null;

  const selectedUniversityId =
    data.patientId ||
    data.patient_id ||
    data.universityId ||
    data.university_id ||
    null;

  // ============================================================
  // BASIC VALIDATION
  // ============================================================

  if (!requesterAuthUid) {
    const error = new Error(
      'Authenticated requester UID is required.'
    );
    error.status = 401;
    throw error;
  }

  if (!selectedPatientId && !selectedUniversityId) {
    const error = new Error(
      'Selected patient user ID or University ID is required.'
    );
    error.status = 422;
    throw error;
  }

  // ============================================================
  // RESOLVE THE LOGGED-IN REQUESTER
  // ============================================================

  const {
    data: requester,
    error: requesterError,
  } = await supabase
    .from('users')
    .select(`
      id,
      uid,
      first_name,
      middle_name,
      last_name,
      role,
      classification,
      student_classification,
      job_title
    `)
    .eq('uid', requesterAuthUid)
    .maybeSingle();

  if (requesterError) {
    console.error(
      '[CREATE APPOINTMENT] Requester lookup failed:',
      requesterError
    );

    throw requesterError;
  }

  if (!requester) {
    const error = new Error(
      'Could not resolve the authenticated requester.'
    );
    error.status = 401;
    throw error;
  }

  // ============================================================
  // RESOLVE THE SELECTED PATIENT
  // ============================================================

  let patient = null;

  if (selectedPatientId) {
    const {
      data: patientById,
      error: patientByIdError,
    } = await supabase
      .from('users')
      .select(`
        id,
        uid,
        university_id,
        first_name,
        middle_name,
        last_name,
        role,
        classification,
        student_classification,
        job_title,
        is_archived
      `)
      .eq('id', selectedPatientId)
      .eq('is_archived', false)
      .maybeSingle();

    if (patientByIdError) {
      console.error(
        '[CREATE APPOINTMENT] Patient UUID lookup failed:',
        patientByIdError
      );

      throw patientByIdError;
    }

    patient = patientById;
  }

  // Fall back to University ID if internal UUID was unavailable.
  if (!patient && selectedUniversityId) {
    const {
      data: patientByUniversityId,
      error: universityIdError,
    } = await supabase
      .from('users')
      .select(`
        id,
        uid,
        university_id,
        first_name,
        middle_name,
        last_name,
        role,
        classification,
        student_classification,
        job_title,
        is_archived
      `)
      .eq('university_id', selectedUniversityId)
      .eq('is_archived', false)
      .maybeSingle();

    if (universityIdError) {
      console.error(
        '[CREATE APPOINTMENT] University ID lookup failed:',
        universityIdError
      );

      throw universityIdError;
    }

    patient = patientByUniversityId;
  }

  if (!patient) {
    const error = new Error(
      'The selected patient was not found or has been archived.'
    );
    error.status = 404;
    throw error;
  }

  // ============================================================
  // DETERMINE REQUESTER ROLE
  // ============================================================

  const requesterRole = String(
    requester.role ||
    requester.classification ||
    requester.student_classification ||
    requester.job_title ||
    ''
  )
    .trim()
    .toLowerCase();

  const clinicStaffRoles = [
    'doctor',
    'physician',
    'dentist',
    'nurse',
    'sysadmin',
    'system administrator',
  ];

  const isClinicStaffCreator = clinicStaffRoles.some(
    (role) => requesterRole.includes(role)
  );

  const appointmentStatus = isClinicStaffCreator
    ? 'approved'
    : 'pending';

  // Clinic-created appointments require a schedule.
  // Patient/faculty requests remain pending without a schedule.
  const requiresSchedule = isClinicStaffCreator;

  // ============================================================
  // NORMALIZE APPOINTMENT VALUES
  // ============================================================

  const patientName =
    data.patientName ||
    data.patient_name ||
    data.name ||
    [
      patient.last_name,
      patient.first_name,
      patient.middle_name,
    ]
      .filter(Boolean)
      .join(', ');

  const serviceType = String(
    data.serviceType ||
    data.service_type ||
    ''
  ).trim();

  const reason = String(
    data.reason ||
    ''
  ).trim();

  const hasYear =
    data.year !== undefined &&
    data.year !== null &&
    data.year !== '';

  const hasMonth =
    data.month !== undefined &&
    data.month !== null &&
    data.month !== '';

  const hasDay =
    data.day !== undefined &&
    data.day !== null &&
    data.day !== '';

  const hasTime =
    data.time !== undefined &&
    data.time !== null &&
    String(data.time).trim() !== '';

  const year = hasYear
    ? Number(data.year)
    : null;

  const month = hasMonth
    ? Number(data.month)
    : null;

  const day = hasDay
    ? Number(data.day)
    : null;

  const appointmentTime = hasTime
    ? String(data.time).trim()
    : null;

  // ============================================================
  // VALIDATE REQUIRED VALUES
  // ============================================================

  if (!patientName) {
    const error = new Error(
      'Patient name is required.'
    );
    error.status = 422;
    throw error;
  }

  if (!serviceType) {
    const error = new Error(
      'Service type is required.'
    );
    error.status = 422;
    throw error;
  }

  if (!reason) {
    const error = new Error(
      'Appointment reason is required.'
    );
    error.status = 422;
    throw error;
  }

  // ============================================================
  // ENFORCE CLINIC ROLE APPOINTMENT TYPE
  // ============================================================

  const serviceText = `${serviceType} ${reason}`
    .toLowerCase();

  const isDentalAppointment =
    serviceText.includes('dent') ||
    serviceText.includes('oral') ||
    serviceText.includes('tooth') ||
    serviceText.includes('teeth');

  const isMedicalAppointment =
    serviceText.includes('medical') ||
    serviceText.includes('check-up') ||
    serviceText.includes('checkup') ||
    !isDentalAppointment;

  if (
    (
      requesterRole.includes('doctor') ||
      requesterRole.includes('physician') ||
      requesterRole.includes('nurse')
    ) &&
    isDentalAppointment
  ) {
    const error = new Error(
      'Doctors and nurses can only create medical appointments.'
    );
    error.status = 403;
    throw error;
  }

  if (
    requesterRole.includes('dentist') &&
    isMedicalAppointment &&
    !isDentalAppointment
  ) {
    const error = new Error(
      'Dentists can only create dental appointments.'
    );
    error.status = 403;
    throw error;
  }

  // ============================================================
  // VALIDATE SCHEDULE FOR CLINIC-CREATED APPOINTMENTS
  // ============================================================

  if (requiresSchedule) {
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      year < 2020 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      const error = new Error(
        'A valid appointment date is required.'
      );
      error.status = 422;
      throw error;
    }

    if (!appointmentTime) {
      const error = new Error(
        'Appointment time is required.'
      );
      error.status = 422;
      throw error;
    }
  }

  // ============================================================
  // REQUESTER INFORMATION
  // ============================================================

  const requesterName = [
    requester.first_name,
    requester.middle_name,
    requester.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const bookedBy = isClinicStaffCreator
    ? (
        data.bookedBy ||
        data.booked_by ||
        requesterName ||
        requesterRole ||
        'Clinic Staff'
      )
    : (
        requesterName ||
        patientName ||
        'Patient'
      );

  const now = new Date().toISOString();

  // ============================================================
  // BUILD APPOINTMENT RECORD
  // ============================================================

  const newDoc = {
    // Always store the selected patient's internal users.id.
    user_id: patient.id,

    patient_name: patientName,
    service_type: serviceType,
    reason,

    // Pending requests do not require a schedule.
    year: requiresSchedule
      ? year
      : null,

    month: requiresSchedule
      ? month
      : null,

    day: requiresSchedule
      ? day
      : null,

    time: requiresSchedule
      ? appointmentTime
      : null,

    status: appointmentStatus,

    booked_by: bookedBy,
    booked_by_id: requester.id,

    is_archived: false,
    created_at: now,
    updated_at: now,
  };

  // ============================================================
  // DEBUG LOGGING
  // ============================================================

  console.log(
    '============================================================'
  );

  console.log('[CREATE APPOINTMENT]');
  console.log(
    'Requester Auth UID:',
    requesterAuthUid
  );
  console.log(
    'Requester users.id:',
    requester.id
  );
  console.log(
    'Requester Role:',
    requesterRole
  );
  console.log(
    'Selected Patient users.id:',
    patient.id
  );
  console.log(
    'University ID:',
    patient.university_id
  );
  console.log(
    'Patient Name:',
    newDoc.patient_name
  );
  console.log(
    'Service:',
    newDoc.service_type
  );
  console.log(
    'Reason:',
    newDoc.reason
  );

  console.log(
    'Schedule:',
    requiresSchedule
      ? `${newDoc.year}-${newDoc.month}-${newDoc.day} ${newDoc.time}`
      : 'Awaiting clinic schedule'
  );

  console.log(
    'Status:',
    newDoc.status
  );

  console.log(
    'Insert payload:',
    newDoc
  );

  console.log(
    '============================================================'
  );

  // ============================================================
  // INSERT APPOINTMENT
  // ============================================================

  const {
    data: appointment,
    error: insertError,
  } = await supabase
    .from('appointments')
    .insert(newDoc)
    .select('*')
    .single();

  if (insertError) {
    console.error(
      '============================================================'
    );

    console.error(
      '[CREATE APPOINTMENT] DATABASE INSERT FAILED'
    );

    console.error(
      'Message:',
      insertError.message
    );

    console.error(
      'Code:',
      insertError.code
    );

    console.error(
      'Details:',
      insertError.details
    );

    console.error(
      'Hint:',
      insertError.hint
    );

    console.error(
      'Payload:',
      newDoc
    );

    console.error(
      '============================================================'
    );

    throw insertError;
  }

  console.log(
    '[CREATE APPOINTMENT] Successfully inserted:',
    appointment
  );

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  if (appointmentStatus === 'approved') {
    // Clinic staff created and scheduled the appointment.
    try {
      await notificationsService.createNotification({
        userId: patient.id,
        type: 'appointment_created',
        title: 'Appointment Scheduled',
        message:
          `A ${serviceType} appointment was scheduled for you ` +
          `on ${month}/${day}/${year} at ${appointmentTime}.`,
        referenceId: appointment.id,
        referenceType: 'appointment',
      });

      console.log(
        '[CREATE APPOINTMENT] Patient notification created.'
      );
    } catch (notificationError) {
      console.error(
        '[CREATE APPOINTMENT] Patient notification failed:',
        notificationError.message
      );
    }
  } else {
    // Patient or faculty submitted a pending request.
    try {
      const targetRoles =
        getTargetRolesForAppointment(
          serviceType,
          reason
        );

      await notificationsService.notifyRoles(
        targetRoles,
        {
          type: 'appointment_request',
          title: 'New Appointment Request',
          message:
            `${patientName} requested an appointment for ` +
            `${serviceType}.`,
          referenceId: appointment.id,
          referenceType: 'appointment',
        }
      );

      console.log(
        '[CREATE APPOINTMENT] Clinic staff notifications created.'
      );
    } catch (notificationError) {
      console.error(
        '[CREATE APPOINTMENT] Staff notification failed:',
        notificationError.message
      );
    }

    // Notify the requester that the request was submitted.
    try {
      await notificationsService.createNotification({
        userId: requester.id,
        type: 'appointment_request_submitted',
        title: 'Appointment Request Submitted',
        message:
          `Your request for a ${serviceType} appointment ` +
          `was submitted successfully. The clinic will review ` +
          `your request and assign the schedule.`,
        referenceId: appointment.id,
        referenceType: 'appointment',
      });

      console.log(
        '[CREATE APPOINTMENT] Requester confirmation notification created.'
      );
    } catch (notificationError) {
      console.error(
        '[CREATE APPOINTMENT] Requester notification failed:',
        notificationError.message
      );
    }
  }

  return appointment;
};
const FACULTY_ROLES = ['faculty', 'lecturer', 'instructor', 'teacher', 'professor'];

exports.createBulkAppointments = async (data) => {
  const {
    authUid, facultyName,
    serviceType, reason, year, month, day, time, studentIds,
  } = data;

  if (!authUid) {
    const err = new Error('Unauthorized session.');
    err.status = 401;
    throw err;
  }

  const { data: requester, error: requesterError } = await supabase
    .from('users')
    .select('*')
    .eq('uid', authUid)
    .single();

  if (requesterError || !requester) {
    const err = new Error('Could not verify your account.');
    err.status = 401;
    throw err;
  }

  const requesterRole = (requester.role || requester.type || '').toLowerCase();
  if (!FACULTY_ROLES.includes(requesterRole)) {
    const err = new Error('Only faculty accounts can submit bulk appointment requests.');
    err.status = 403;
    throw err;
  }

  const uniqueIds = [...new Set(studentIds.map((id) => String(id).trim()).filter(Boolean))];

  const { data: matchedUsers, error: lookupError } = await supabase
    .from('users')
    .select('id, university_id, first_name, middle_name, last_name')
    .in('university_id', uniqueIds);

  if (lookupError) throw lookupError;

  const foundIds = new Set((matchedUsers || []).map((u) => u.university_id));
  const notFound = uniqueIds.filter((id) => !foundIds.has(id));

  if (!matchedUsers || matchedUsers.length === 0) {
    const err = new Error('None of the University IDs in the CSV matched an existing student record.');
    err.status = 400;
    throw err;
  }

  const batchId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const rows = matchedUsers.map((student) => ({
    user_id: student.id,
    patient_name: [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ') || student.university_id,
    service_type: serviceType,
    reason: reason || '',
    year: year || new Date().getFullYear(),
    month: month || (new Date().getMonth() + 1),
    day: day || null,
    time: time || '',
    status: 'pending',
    batch_id: batchId,
    booked_by: facultyName,
    booked_by_id: requester.id,
    created_at: nowIso,
    updated_at: nowIso,
  }));

const { data: inserted, error: insertError } = await supabase
  .from('appointments')
  .insert(rows)
  .select();

if (insertError) {
  console.error(
    '>>> [DB] Bulk Appointment Insert Error:',
    insertError.message
  );
  throw insertError;
}

const targetRoles = getTargetRolesForAppointment(serviceType, reason);

try {
  await notificationsService.notifyRoles(targetRoles, {
    type: 'appointment_request',
    title: 'New Bulk Appointment Request',
    message:
      `${facultyName} submitted a bulk appointment request for ` +
      `${inserted.length} student${inserted.length === 1 ? '' : 's'} ` +
      `(${serviceType}).`,
    referenceId: batchId,
    referenceType: 'appointment_batch',
  });
} catch (notificationError) {
  console.error(
    '[CREATE BULK APPOINTMENTS] Staff notification failed:',
    notificationError.message
  );
}

try {
  await notificationsService.createNotification({
    userId: requester.id,
    type: 'bulk_appointment_submitted',
    title: 'Bulk Appointment Request Submitted',
    message:
      `Your bulk appointment request for ` +
      `${inserted.length} student${inserted.length === 1 ? '' : 's'} ` +
      `has been submitted successfully and is awaiting clinic approval.`,
    referenceId: batchId,
    referenceType: 'appointment_batch',
  });
} catch (notificationError) {
  console.error(
    '[CREATE BULK APPOINTMENTS] Requester notification failed:',
    notificationError.message
  );
}

return {
  batchId,
  created: inserted,
  notFoundIds: notFound,
};
};

// ============================================================
// UPDATE APPOINTMENT
// ============================================================

exports.updateAppointment = async (id, data) => {
  const {
    data: existingData,
    error: fetchError,
  } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  if (!existingData) {
    const error = new Error('Appointment not found.');
    error.status = 404;
    throw error;
  }

  const updateData = {
    updated_at: new Date().toISOString(),
  };

  if (data.status !== undefined) {
    updateData.status = String(data.status).toLowerCase();
  }

  if (data.service_type !== undefined) {
    updateData.service_type = data.service_type;
  }

  if (data.reason !== undefined) {
    updateData.reason = data.reason;
  }

  if (data.year !== undefined) {
    updateData.year = data.year;
  }

  if (data.month !== undefined) {
    updateData.month = data.month;
  }

  if (data.day !== undefined) {
    updateData.day = data.day;
  }

  // Important: allows null to clear the existing time.
  if (data.time !== undefined) {
    updateData.time =
      data.time === null || data.time === ''
        ? null
        : String(data.time).slice(0, 5);
  }

  if (data.nurse_notes !== undefined) {
    updateData.nurse_notes = data.nurse_notes;
  }

  if (data.doctor_notes !== undefined) {
    updateData.doctor_notes = data.doctor_notes;
  }

  // Pending appointments must never retain a schedule.
  if (updateData.status === 'pending') {
    updateData.year = null;
    updateData.month = null;
    updateData.day = null;
    updateData.time = null;
  }

  console.log('[UPDATE APPOINTMENT] ID:', id);
  console.log('[UPDATE APPOINTMENT] Payload:', updateData);

  const {
    data: updatedAppointment,
    error: updateError,
  } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) throw updateError;

  const userUUID = existingData.user_id;

  if (userUUID) {
    const statusChanged =
      updateData.status !== undefined &&
      updateData.status !==
        String(existingData.status || '').toLowerCase();

    const rescheduled = ['day', 'month', 'year', 'time'].some(
      (field) =>
        Object.prototype.hasOwnProperty.call(updateData, field) &&
        String(updateData[field] ?? '') !==
          String(existingData[field] ?? '')
    );

    const edited =
      ['service_type', 'reason'].some(
        (field) =>
          Object.prototype.hasOwnProperty.call(updateData, field) &&
          String(updateData[field] ?? '') !==
            String(existingData[field] ?? '')
      ) ||
      updateData.nurse_notes !== undefined ||
      updateData.doctor_notes !== undefined;

    let notificationPayload = null;

    if (statusChanged) {
      const status = updateData.status;
      const { title, message } =
        buildStatusNotification(status);

      notificationPayload = {
        type: 'appointment_status',
        title,
        message,
      };
    } else if (
      rescheduled &&
      updateData.status !== 'pending'
    ) {
      const newWhen = formatAppointmentDateTime({
        year: updatedAppointment.year,
        month: updatedAppointment.month,
        day: updatedAppointment.day,
        time: updatedAppointment.time,
      });

      notificationPayload = {
        type: 'appointment_reschedule',
        title: 'Appointment Rescheduled',
        message: `Your appointment has been rescheduled to ${newWhen}.`,
      };
    } else if (edited) {
      notificationPayload = {
        type: 'appointment_updated',
        title: 'Appointment Details Updated',
        message:
          'Your appointment details have been updated by clinic staff. Please review the changes.',
      };
    }

    if (notificationPayload) {
      try {
        await notificationsService.createNotification({
          ...notificationPayload,
          userId: userUUID,
          referenceId: id,
          referenceType: 'appointment',
        });
      } catch (notifyErr) {
        console.error(
          '[updateAppointment] Notification insert failed:',
          notifyErr.message
        );
      }
    }
  }

  return updatedAppointment;
};

// ============================================================
// ARCHIVE APPOINTMENT (SOFT DELETE)
// Soft-deletes (is_archived = true) and notifies the patient.
// ============================================================

exports.archiveAppointment = async (id) => {
  console.log(`\n--- STARTING ARCHIVE FOR APPOINTMENT ID: ${id} ---`);

  // 1. Fetch existing data
  const { data: existingData, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;
  if (!existingData) throw new Error('Appointment not found.');

  console.log(`[archiveAppointment] Found appointment. Linked user_id is:`, existingData.user_id || 'NULL');

  // 2. Perform the soft delete
  const { error: updateError } = await supabase
    .from('appointments')
    .update({
      is_archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) throw updateError;
  console.log(`[archiveAppointment] Database update successful (is_archived = true)`);

  // 3. Dispatch Notification
  if (existingData.user_id) {
    console.log(`[archiveAppointment] Calling notificationsService.createNotification...`);
    try {
      const result = await notificationsService.createNotification({
        type: 'appointment_archived',
        title: 'Appointment Archived',
        message: 'Your appointment record has been archived by the clinic.',
        userId: existingData.user_id, // Your notifications service correctly maps this!
        referenceId: id,
        referenceType: 'appointment',
      });
      console.log(`[archiveAppointment] SUCCESS! Notification created with ID:`, result?.id);
    } catch (notifyErr) {
      console.error('[archiveAppointment] FAILED to create notification:', notifyErr);
    }
  } else {
    console.log('[archiveAppointment] ABORTED notification. The user_id is null for this appointment.');
  }

  console.log(`--- FINISHED ARCHIVE FOR APPOINTMENT ID: ${id} ---\n`);

  return { id, is_archived: true };
};

exports.deleteAppointment = async (id) => {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw error;
  return { id };
};