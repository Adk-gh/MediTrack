// backend/features/appointments/appointments.service.js
const supabase = require('../../configs/database');
const notificationsService = require('../notifications/notifications.service');

exports.getUserAppointments = async (authUid) => {
  if (!authUid) throw new Error('Unauthorized session.');

  // Find the internal user ID from the auth UID
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, uid')
    .eq('uid', authUid)
    .single();

  const internalUserId = userProfile?.id;
  console.log('[SERVICE] authUid:', authUid, '-> internalUserId:', internalUserId);

  if (!internalUserId) {
    console.log('[SERVICE] No internal user found for authUid');
    return [];
  }

  // Query using internal user ID
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', internalUserId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  console.log('[SERVICE] Found appointments:', data?.length || 0);

  if (error) {
    console.log('[SERVICE] Query error:', error.message);
    throw error;
  }

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
    .eq('year',  parseInt(year))
    .eq('month', parseInt(month))
    .eq('day',   parseInt(day))
    .eq('is_archived', false);

  if (error) throw error;
  return data;
};

exports.createAppointment = async (data) => {
  // Priority: user_id from frontend (already resolved) > authUid (from token) > patientId
  let resolvedUserId = data.userId || data.patientId || data.idno || '';

  if (data.authUid) {
    // authUid is the authentication UID (stored in users.uid), need to map to internal user id
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
    user_id:      resolvedUserId,
    patient_name: data.patientName || data.name || '',
    service_type: data.type || data.serviceType || '',
    reason:       data.reason || '',
    year:         data.year  || new Date().getFullYear(),
    month:        data.month || (new Date().getMonth() + 1),
    day:          data.day   || null,
    time:         data.time  || '',
    // ── FIX: always store lowercase so frontend comparisons work ──────────
    status:       'pending',
    created_at:   new Date().toISOString(),
    updated_at:   new Date().toISOString(),
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

  await notificationsService.notifyAdmins({
    type:          'appointment_request',
    title:         'New Appointment Request',
    message:       `New appointment request from ${data.patientName || 'Unknown User'}`,
    referenceId:   appointment.id,
    referenceType: 'appointment',
  });

  return appointment;
};

exports.updateAppointment = async (id, data) => {
  const { data: existingData } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  const updateData = { updated_at: new Date().toISOString() };

  // ── FIX: normalise status to lowercase on every write ────────────────────
  if (data.status)            updateData.status       = data.status.toLowerCase();
  if (data.service_type)      updateData.service_type = data.service_type;
  if (data.reason)            updateData.reason       = data.reason;
  if (data.day   !== undefined) updateData.day        = data.day;
  if (data.month !== undefined) updateData.month      = data.month;
  if (data.year  !== undefined) updateData.year       = data.year;
  if (data.time)              updateData.time         = data.time;
  if (data.nurse_notes)       updateData.nurse_notes  = data.nurse_notes;
  if (data.doctor_notes)      updateData.doctor_notes = data.doctor_notes;

  const { error } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', id);

  if (error) throw error;

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
        notificationMessage = 'Your appointment has been rejected. Please contact the clinic for more information.';
      } else if (status === 'completed') {
        notificationTitle = 'Appointment Completed';
        notificationMessage = 'Your appointment has been marked as completed.';
      } else if (status === 'cancelled') {
        notificationTitle = 'Appointment Cancelled';
        notificationMessage = 'Your appointment has been cancelled.';
      } else {
        notificationMessage = `Your appointment status has been updated to: ${status}`;
      }

      await notificationsService.createNotification({
        type:          'appointment_status',
        title:         notificationTitle,
        message:       notificationMessage,
        userId:        userUUID,
        referenceId:   id,
        referenceType: 'appointment',
      });
    }
  }

  return { id, ...data };
};

exports.deleteAppointment = async (id) => {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw error;
  return { id };
};