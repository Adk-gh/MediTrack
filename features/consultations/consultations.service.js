// C:\Users\HP\MediTrack\features\consultations\consultations.service.js
const supabase = require('../../configs/database');
const archiveHelper = require('../archives/archiveHelper');

const ARCHIVE_TYPE = 'consultation';

exports.getAllConsultations = async (consultationType = null, role = null) => {
  let query = supabase
    .from('consultations')
    .select('*')
    .eq('is_archived', false)
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
    .eq('is_archived', false)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

exports.getConsultationsByPatient = async (patientId) => {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('patient_id', patientId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

exports.createConsultation = async (consultationData) => {
  const { patient_id, consultation_type } = consultationData;

  // ── STEP 1: Return existing active session immediately ────────────────
  const { data: activeRows, error: activeError } = await supabase
    .from('consultations')
    .select('*')
    .eq('patient_id', patient_id)
    .eq('consultation_type', consultation_type)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (activeError) throw new Error(activeError.message);

  if (activeRows?.[0]) {
    return activeRows[0];
  }

  // ── STEP 2: Always create a new session (skip reactivation) ───────────
  // Creating a new consultation ensures it's properly set to 'active' from the start

  const insertPayload = {
    patient_id: patient_id,
    consultation_type: consultation_type,
    patient_name: consultationData.patient_name || null,
    created_by: consultationData.created_by || null,
    status: 'active',
    ended_at: null,
  };

  const { data, error } = await supabase
    .from('consultations')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('[createConsultation] Insert error:', error);
    throw new Error(error.message);
  }

  return data;
};

exports.updateConsultation = async (id, data) => {
  const updateData = { ...data };
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
  return exports.updateConsultation(id, {
    status:   'ended',
    ended_at: new Date().toISOString(),
  });
};

exports.deleteConsultation = async (id, deletedBy) => {
  // Move to archives before deletion
  await archiveHelper.archiveAndDelete({
    type: ARCHIVE_TYPE,
    originalId: id,
    tableName: 'consultations',
    idColumn: 'id',
    deletedBy
  }, supabase);

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
    message:         messageData.text || messageData.message,
    sender_id:       messageData.sender_id   || null,
    sender_name:     messageData.sender_name || null,
    sender_role:     messageData.sender_role || null,
    created_at:      new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('consultation_messages')
    .insert(newMessage)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// Mark messages as read
exports.markMessagesAsRead = async (consultationId, readerId, readerRole) => {
  console.log('[markMessagesAsRead] Called with:', { consultationId, readerId, readerRole });

  // First, get all unread messages for this consultation
  const { data: unreadMessages, error: fetchError } = await supabase
    .from('consultation_messages')
    .select('id, sender_id, read_at')
    .eq('consultation_id', consultationId)
    .is('read_at', null)
    .not('sender_id', 'is', null);

  console.log('[markMessagesAsRead] Unread messages:', unreadMessages);

  if (fetchError) {
    console.error('[markMessagesAsRead] Fetch error:', fetchError);
    throw new Error(fetchError.message);
  }

  if (!unreadMessages || unreadMessages.length === 0) {
    console.log('[markMessagesAsRead] No unread messages to mark');
    return [];
  }

  // Mark only messages where sender_id is NOT equal to readerId
  const messagesToMark = unreadMessages.filter(msg => msg.sender_id !== readerId);
  console.log('[markMessagesAsRead] Messages to mark as read:', messagesToMark);

  if (messagesToMark.length === 0) {
    console.log('[markMessagesAsRead] No messages from other sender');
    return [];
  }

  const messageIds = messagesToMark.map(msg => msg.id);

  // Update only those messages
  const { data, error } = await supabase
    .from('consultation_messages')
    .update({ read_at: new Date().toISOString() })
    .in('id', messageIds)
    .select();

  if (error) {
    console.error('[markMessagesAsRead] Update error:', error);
    throw new Error(error.message);
  }

  console.log(`[markMessagesAsRead] Marked ${data?.length || 0} messages as read`);
  return data;
};

// Presence
exports.setUserPresence = async (authUid, status = 'online') => {
  const { data: publicUser, error: lookupError } = await supabase
    .from('users')
    .select('id')
    .eq('uid', authUid)
    .single();

  if (lookupError || !publicUser) {
    throw new Error(`User not found in public.users for uid: ${authUid}`);
  }

  const { data, error } = await supabase
    .from('presence')
    .upsert({
      user_id:   publicUser.id,
      status,
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