// utils/appointmentValidator.js
const { supabase } = require('../config/supabase');

const verifyAppointmentWindow = async (patientId, consultType) => {
  const { data: appointments, error } = await supabase
    .from('appointments')
    // Changed service_type to reason
    .select('year, month, day, time, reason')
    .eq('user_id', patientId)
    .eq('status', 'approved')
    .eq('is_archived', false)
    // Filter the DB using the reason column
    .ilike('reason', '%online%');

  if (error || !appointments || appointments.length === 0) {
    return { allowed: false, message: 'No approved online appointment found.' };
  }

  // Check the reason column for "medical" or "dental"
  const matchingAppointments = appointments.filter(appt =>
    appt.reason?.toLowerCase().includes(consultType.toLowerCase())
  );

  if (matchingAppointments.length === 0) {
    return { allowed: false, message: `No approved online ${consultType} appointment found.` };
  }

  const now = new Date();

  const hasActiveSlot = matchingAppointments.some(appt => {
    if (!appt.year || !appt.month || !appt.day || !appt.time) return false;

    const [hour, minute] = appt.time.split(':').map(Number);
    const apptStart = new Date(appt.year, appt.month - 1, appt.day, hour, minute);
    const apptEnd = new Date(apptStart.getTime() + 60 * 60 * 1000);

    return now >= apptStart && now <= apptEnd;
  });

  if (!hasActiveSlot) {
    return { allowed: false, message: 'Your appointment time is not currently active.' };
  }

  return { allowed: true };
};

module.exports = { verifyAppointmentWindow };