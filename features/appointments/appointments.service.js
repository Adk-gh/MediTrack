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
  const selectedPatientId = data.userId;

  if (!requesterAuthUid) {
    const error = new Error('Authenticated requester UID is required.');
    error.status = 401;
    throw error;
  }

  if (!selectedPatientId) {
    const error = new Error('Selected patient user ID is required.');
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

  const {
    data: patient,
    error: patientError,
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
      is_archived
    `)
    .eq('id', selectedPatientId)
    .eq('is_archived', false)
    .maybeSingle();

  if (patientError) {
    console.error(
      '[CREATE APPOINTMENT] Patient lookup failed:',
      patientError
    );
    throw patientError;
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

  const isClinicStaffCreator = clinicStaffRoles.some((role) =>
    requesterRole.includes(role)
  );

  const appointmentStatus = isClinicStaffCreator
    ? 'approved'
    : 'pending';

  // ============================================================
  // NORMALIZE APPOINTMENT VALUES
  // ============================================================

  const patientName =
    data.patientName ||
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

  const reason = String(data.reason || '').trim();
  const appointmentTime = String(data.time || '').trim();

  const year = Number(data.year);
  const month = Number(data.month);
  const day = Number(data.day);

  if (!patientName) {
    const error = new Error('Patient name is required.');
    error.status = 422;
    throw error;
  }

  if (!serviceType) {
    const error = new Error('Service type is required.');
    error.status = 422;
    throw error;
  }

  if (!reason) {
    const error = new Error('Appointment reason is required.');
    error.status = 422;
    throw error;
  }

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    const error = new Error(
      'A valid appointment date is required.'
    );
    error.status = 422;
    throw error;
  }

  if (!appointmentTime) {
    const error = new Error('Appointment time is required.');
    error.status = 422;
    throw error;
  }

  const requesterName = [
    requester.first_name,
    requester.middle_name,
    requester.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const now = new Date().toISOString();

  const newDoc = {
    // This must be the selected patient's users.id
    user_id: patient.id,

    patient_name: patientName,
    service_type: serviceType,
    reason,
    year,
    month,
    day,
    time: appointmentTime,
    status: appointmentStatus,

    booked_by:
      data.bookedBy ||
      requesterName ||
      requesterRole ||
      'Clinic Staff',

    booked_by_id: requester.id,

    is_archived: false,
    created_at: now,
    updated_at: now,
  };

  console.log('============================================================');
  console.log('[CREATE APPOINTMENT]');
  console.log('Requester Auth UID:', requesterAuthUid);
  console.log('Requester users.id:', requester.id);
  console.log('Requester Role:', requesterRole);
  console.log('Selected Patient users.id:', patient.id);
  console.log('University ID:', patient.university_id);
  console.log('Patient Name:', newDoc.patient_name);
  console.log('Service:', newDoc.service_type);
  console.log('Reason:', newDoc.reason);
  console.log(
    'Schedule:',
    `${newDoc.year}-${newDoc.month}-${newDoc.day}`,
    newDoc.time
  );
  console.log('Status:', newDoc.status);
  console.log('Insert payload:', newDoc);
  console.log('============================================================');

  const {
    data: appointment,
    error: insertError,
  } = await supabase
    .from('appointments')
    .insert(newDoc)
    .select('*')
    .single();

  if (insertError) {
    console.error('============================================================');
    console.error('[CREATE APPOINTMENT] DATABASE INSERT FAILED');
    console.error('Message:', insertError.message);
    console.error('Code:', insertError.code);
    console.error('Details:', insertError.details);
    console.error('Hint:', insertError.hint);
    console.error('Payload:', newDoc);
    console.error('============================================================');

    throw insertError;
  }

  console.log(
    '[CREATE APPOINTMENT] Successfully inserted:',
    appointment
  );

  // Staff-created appointments are already approved,
  // so notify the selected patient.
  if (appointmentStatus === 'approved') {
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
    } catch (notificationError) {
      console.error(
        '[CREATE APPOINTMENT] Patient notification failed:',
        notificationError.message
      );
    }
  } else {
    try {
      const targetRoles = getTargetRolesForAppointment(
        serviceType,
        reason
      );

      await notificationsService.notifyRoles(targetRoles, {
        type: 'appointment_request',
        title: 'New Appointment Request',
        message:
          `${patientName} requested an appointment for ` +
          `${serviceType}.`,
        referenceId: appointment.id,
        referenceType: 'appointment',
      });
    } catch (notificationError) {
      console.error(
        '[CREATE APPOINTMENT] Staff notification failed:',
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
// Detects and notifies on: status change, reschedule, or
// other field edits (reason / service type / clinical notes).
// Only ONE notification is sent per update, prioritized as:
// status change > reschedule > general edit — to avoid
// spamming the patient when several fields change together.
// ============================================================

exports.updateAppointment = async (id, data) => {
  const { data: existingData } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  const updateData = { updated_at: new Date().toISOString() };

  if (data.status) updateData.status = data.status.toLowerCase();
  if (data.service_type) updateData.service_type = data.service_type;
  if (data.reason) updateData.reason = data.reason;
  if (data.day !== undefined) updateData.day = data.day;
  if (data.month !== undefined) updateData.month = data.month;
  if (data.year !== undefined) updateData.year = data.year;
  if (data.time) updateData.time = data.time;
  if (data.nurse_notes) updateData.nurse_notes = data.nurse_notes;
  if (data.doctor_notes) updateData.doctor_notes = data.doctor_notes;

  const { error } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', id);

  if (error) throw error;

  const userUUID = existingData?.user_id;

  if (userUUID) {
    const statusChanged =
      !!data.status &&
      data.status.toLowerCase() !== existingData?.status?.toLowerCase();

    const rescheduled = ['day', 'month', 'year', 'time'].some(
      (field) =>
        updateData[field] !== undefined &&
        String(updateData[field]) !== String(existingData?.[field] ?? '')
    );

    const edited =
      ['service_type', 'reason'].some(
        (field) =>
          updateData[field] !== undefined &&
          String(updateData[field]) !== String(existingData?.[field] ?? '')
      ) ||
      updateData.nurse_notes !== undefined ||
      updateData.doctor_notes !== undefined;

    let notificationPayload = null;

    if (statusChanged) {
      const status = data.status.toLowerCase();
      const { title, message } = buildStatusNotification(status);

      notificationPayload = {
        type: 'appointment_status',
        title,
        message,
      };
    } else if (rescheduled) {
      const newWhen = formatAppointmentDateTime({
        year: updateData.year ?? existingData.year,
        month: updateData.month ?? existingData.month,
        day: updateData.day ?? existingData.day,
        time: updateData.time ?? existingData.time,
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
        message: 'Your appointment details have been updated by clinic staff. Please review the changes.',
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
        console.error('[updateAppointment] Notification insert failed:', notifyErr.message);
      }
    }
  }

  return { id, ...data };
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