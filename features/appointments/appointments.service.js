// backend/features/appointments/appointments.service.js
const supabase = require('../../configs/database');
const notificationsService = require('../notifications/notifications.service');

exports.getUserAppointments = async (authUid) => {
  if (!authUid) throw new Error('Unauthorized session.');

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id')
    .eq('uid', authUid)
    .single();

  if (profileError || !userProfile) {
    throw new Error('User profile record not found.');
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userProfile.id)
    .order('year',  { ascending: false })
    .order('month', { ascending: false })
    .order('day',   { ascending: false });

  if (error) throw error;
  return data;
};

exports.getAllAppointments = async () => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
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
    .eq('day',   parseInt(day));

  if (error) throw error;
  return data;
};

exports.createAppointment = async (data) => {
  let resolvedUserId = data.userId || data.idno || '';

  if (data.authUid) {
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('uid', data.authUid)
      .single();
    if (profile) resolvedUserId = profile.id;
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
    const internalUserId = existingData?.user_id;
    if (internalUserId) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('uid')
        .eq('id', internalUserId)
        .single();

      if (userProfile?.uid) {
        await notificationsService.createNotification({
          type:          'appointment_status',
          title:         'Appointment Status Updated',
          message:       `Your appointment has been ${data.status.toLowerCase()}`,
          userId:        userProfile.uid,
          referenceId:   id,
          referenceType: 'appointment',
        });
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