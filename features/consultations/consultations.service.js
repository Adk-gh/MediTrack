//C:\Users\HP\MediTrack\features\consultations\consultations.service.js
const supabase = require('../../configs/database');

exports.getAllConsultations = async (consultationType = null, role = null) => {
  let query = supabase
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false });

  if (consultationType) {
    query = query.eq('consultation_type', consultationType);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

exports.getConsultationById = async (id) => {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

exports.getConsultationsByPatient = async (patientId) => {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

exports.createConsultation = async (consultationData) => {
  const newDoc = {
    ...consultationData,
    status: 'active',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('consultations')
    .insert(newDoc)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

exports.updateConsultation = async (id, data) => {
  // Clone the data so we don't mutate the original request
  const updateData = { ...data };

  // Remove updated_at if the frontend accidentally sends it, since it's not in the schema
  delete updateData.updated_at;

  const { data: result, error } = await supabase
    .from('consultations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return result;
};

exports.endConsultation = async (id) => {
  return this.updateConsultation(id, { status: 'ended', ended_at: new Date().toISOString() });
};

exports.endConsultation = async (id) => {
  return this.updateConsultation(id, { status: 'ended', ended_at: new Date().toISOString() });
};

exports.deleteConsultation = async (id) => {
  const { error } = await supabase
    .from('consultations')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { success: true };
};

// Messages
exports.getMessagesByConsultationId = async (consultationId) => {
  const { data, error } = await supabase
    .from('consultation_messages')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

exports.sendMessage = async (consultationId, messageData) => {
  const newMessage = {
    consultation_id: consultationId,
    message: messageData.text || messageData.message,
    sender_id: messageData.sender_id,
    sender_name: messageData.sender_name,
    sender_role: messageData.sender_role,
    is_bot: messageData.is_bot || false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('consultation_messages')
    .insert(newMessage)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// Presence
exports.setUserPresence = async (userId, status = 'online') => {
  const { data, error } = await supabase
    .from('presence')
    .upsert({
      user_id: userId,
      status: status,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

exports.getOnlineUsers = async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('presence')
    .select('*')
    .gte('last_seen', fiveMinutesAgo)
    .eq('status', 'online');

  if (error) throw new Error(error.message);
  return data;
};

exports.getPresence = async () => {
  const { data, error } = await supabase
    .from('presence')
    .select('*');

  if (error) throw new Error(error.message);
  return data;
};