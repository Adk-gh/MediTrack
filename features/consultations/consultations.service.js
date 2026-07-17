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

  console.log('[createConsultation] === START ===');
  console.log('[createConsultation] Searching for:', { patient_id, consultation_type });
  console.log('[createConsultation] Full input data:', JSON.stringify(consultationData));

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
    console.log(`[createConsultation] STEP 1: Already active, returning: ${activeRows[0].id} status: ${activeRows[0].status}`);
    return activeRows[0];
  }

  console.log('[createConsultation] STEP 1: No active consultation found');

  // ── STEP 2: Reactivate the most recent ended session ──────────────────
  const { data: endedRows, error: endedError } = await supabase
    .from('consultations')
    .select('*')
    .eq('patient_id', patient_id)
    .eq('consultation_type', consultation_type)
    .eq('status', 'ended')
    .order('created_at', { ascending: false })
    .limit(1);

  if (endedError) throw new Error(endedError.message);

  const existingChat = endedRows?.[0] || null;

  if (existingChat) {
    console.log(`[createConsultation] STEP 2: Found ended session: ${existingChat.id} status: ${existingChat.status}`);

    // First update - explicitly set status to 'active' and clear ended_at
    console.log('[createConsultation] Attempting to update status to active...');
    const { error: updateError } = await supabase
      .from('consultations')
      .update({
        status:   'active',
        ended_at: null,
      })
      .eq('id', existingChat.id);

    console.log('[createConsultation] Update completed, error:', updateError);

    // Log the current state after update
    const { data: afterUpdate } = await supabase
      .from('consultations')
      .select('id, status, ended_at')
      .eq('id', existingChat.id)
      .single();
    console.log('[createConsultation] State right after update:', afterUpdate);

    if (updateError) {
      console.error('[createConsultation] Update error:', updateError);
      throw new Error(updateError.message);
    }

    // Fetch fresh data AFTER update to ensure we get the correct status
    console.log('[createConsultation] Fetching reactivated consultation...');
    const { data: reactivated, error: fetchError } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', existingChat.id)
      .single();

    console.log('[createConsultation] Reactivated data:', JSON.stringify(reactivated));
    console.log('[createConsultation] Final status being returned:', reactivated?.status);

    if (fetchError) {
      console.error('[createConsultation] Fetch error:', fetchError);
      throw new Error(fetchError.message);
    }

    return reactivated;
  }

  // ── STEP 3: No history — create a brand new session ───────────────────
  console.log('[createConsultation] STEP 3: No existing session, creating new one');
  // FIX: Only insert columns that exist in public.consultations:
  //   id (auto), consultation_type, created_by, patient_id,
  //   patient_name, status, created_at, ended_at
  // The frontend also sends patient_role — that column does NOT exist
  // in the table, so spreading consultationData caused the 500.
  console.log(`[createConsultation] Creating new thread for patient: ${patient_id}`);

  const insertPayload = {
    patient_id: patient_id,
    consultation_type: consultation_type,
    patient_name: consultationData.patient_name || null,
    created_by: consultationData.created_by || null,
    status: 'active',
    ended_at: null,
  };

  console.log('[createConsultation] Insert payload:', JSON.stringify(insertPayload));

  const { data, error } = await supabase
    .from('consultations')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('[createConsultation] Insert error:', error);
    throw new Error(error.message);
  }

  console.log('[createConsultation] Insert result:', JSON.stringify(data));

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