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

  if (data.authUid) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, uid')
      .eq('uid', data.authUid)
      .single();

    if (userProfile?.id) {
      resolvedUserId = userProfile.id;
    }
  }

  const newDoc = {
    user_id: resolvedUserId,
    patient_name: data.patientName || data.name || '',
    service_type: data.type || data.serviceType || '',
    reason: data.reason || '',
    year: data.year || new Date().getFullYear(),
    month: data.month || (new Date().getMonth() + 1),
    day: data.day || null,
    time: data.time || '',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert(newDoc)
    .select()
    .single();

  if (error) {
    console.error('>>> [DB] Appointment Insert Error:', error.message);
    throw error;
  }

  // ── Dispatch Targeted Notification to Relevant Staff ──
  const targetRoles = getTargetRolesForAppointment(newDoc.service_type, newDoc.reason);
  const patientDisplayName = data.patientName || data.name || 'A student/patient';

  await notificationsService.notifyRoles(targetRoles, {
    type: 'appointment_request',
    title: 'New Appointment Request',
    message: `${patientDisplayName} requested an appointment for ${newDoc.service_type || newDoc.reason || 'consultation'}.`,
    referenceId: appointment.id,
    referenceType: 'appointment',
  });

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

  // ── Trigger notification to the patient on status change ──
  if (data.status && data.status.toLowerCase() !== existingData?.status?.toLowerCase()) {
    const userUUID = existingData?.user_id;
    if (userUUID) {
      let notificationTitle = 'Appointment Status Updated';
      let notificationMessage = '';

      const status = data.status.toLowerCase();
      if (status === 'approved') {
        notificationTitle = 'Appointment Approved!';
        notificationMessage = 'Great news! Your appointment has been approved by the clinic staff.';
      } else if (status === 'rejected') {
        notificationTitle = 'Appointment Rejected';
        notificationMessage = 'Your appointment request has been declined. Please consult clinic staff.';
      } else if (status === 'done' || status === 'completed') {
        notificationTitle = 'Appointment Completed';
        notificationMessage = 'Your appointment has been marked as completed.';
      } else if (status === 'missed') {
        notificationTitle = 'Appointment Missed';
        notificationMessage = 'You missed your scheduled appointment window.';
      } else {
        notificationMessage = `Your appointment status has been updated to: ${status}`;
      }

      try {
        await notificationsService.createNotification({
          type: 'appointment_status',
          title: notificationTitle,
          message: notificationMessage,
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

exports.deleteAppointment = async (id) => {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw error;
  return { id };
};