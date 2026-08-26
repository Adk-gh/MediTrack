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
  let resolvedUserId = data.userId || data.patientId || data.idno || '';

  // ============================================================
  // RESOLVE AUTHENTICATED USER
  // ============================================================

  let requester = null;

  if (data.authUid) {
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, uid, role, type')
      .eq('uid', data.authUid)
      .single();

    if (userError) {
      console.error(
        '>>> [DB] Failed to resolve authenticated user:',
        userError.message
      );
      throw userError;
    }

    requester = userProfile;

    // If the authenticated user is also the patient,
    // resolve their internal database ID.
    if (userProfile?.id && !resolvedUserId) {
      resolvedUserId = userProfile.id;
    }
  }

  // ============================================================
  // DETERMINE CREATOR ROLE
  // ============================================================

  const requesterRole = String(
    requester?.role ||
    requester?.type ||
    data.role ||
    ''
  ).toLowerCase().trim();

  // ============================================================
  // CLINIC STAFF CREATED APPOINTMENTS
  // ARE AUTOMATICALLY APPROVED
  // ============================================================

  const clinicStaffRoles = [
    'doctor',
    'dentist',
    'nurse',
  ];

  const isClinicStaffCreator = clinicStaffRoles.includes(requesterRole);

  const appointmentStatus = isClinicStaffCreator
    ? 'approved'
    : 'pending';

  // ============================================================
  // CREATE APPOINTMENT
  // ============================================================

  const newDoc = {
    user_id: resolvedUserId,
    patient_name: data.patientName || data.name || '',
    service_type: data.type || data.serviceType || '',
    reason: data.reason || '',
    year: data.year || new Date().getFullYear(),
    month: data.month || (new Date().getMonth() + 1),
    day: data.day || null,
    time: data.time || '',
    status: appointmentStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log('============================================================');
  console.log('[CREATE APPOINTMENT]');
  console.log('Requester UID:', data.authUid);
  console.log('Requester Role:', requesterRole);
  console.log('Patient User ID:', resolvedUserId);
  console.log('Patient Name:', newDoc.patient_name);
  console.log('Service:', newDoc.service_type);
  console.log('Reason:', newDoc.reason);
  console.log('Date:', `${newDoc.year}-${newDoc.month}-${newDoc.day}`);
  console.log('Time:', newDoc.time);
  console.log('Status:', newDoc.status);
  console.log('============================================================');

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert(newDoc)
    .select()
    .single();

  if (error) {
    console.error(
      '>>> [DB] Appointment Insert Error:',
      error.message
    );
    throw error;
  }

  // ============================================================
  // NOTIFY RELEVANT CLINIC STAFF
  // ============================================================

  // Only send a "new appointment request" notification
  // when the appointment actually requires approval.
  if (appointmentStatus === 'pending') {
    const targetRoles = getTargetRolesForAppointment(
      newDoc.service_type,
      newDoc.reason
    );

    const patientDisplayName =
      data.patientName ||
      data.name ||
      'A student/patient';

    await notificationsService.notifyRoles(targetRoles, {
      type: 'appointment_request',
      title: 'New Appointment Request',
      message: `${patientDisplayName} requested an appointment for ${
        newDoc.service_type ||
        newDoc.reason ||
        'consultation'
      }.`,
      referenceId: appointment.id,
      referenceType: 'appointment',
    });
  }

  // ============================================================
  // RETURN CREATED APPOINTMENT
  // ============================================================

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
    console.error('>>> [DB] Bulk Appointment Insert Error:', insertError.message);
    throw insertError;
  }

  // ── Dispatch Targeted Notification to Relevant Staff ──
  const targetRoles = getTargetRolesForAppointment(serviceType, reason);
  await notificationsService.notifyRoles(targetRoles, {
    type: 'appointment_request',
    title: 'New Bulk Appointment Request',
    message: `${facultyName} submitted a bulk request for ${inserted.length} students (${serviceType}).`,
    referenceId: batchId,
    referenceType: 'appointment_batch',
  });

  return { batchId, created: inserted, notFoundIds: notFound };
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