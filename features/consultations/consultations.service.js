// C:\Users\HP\MediTrack\features\consultations\consultations.service.js
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
  const { patient_id, consultation_type } = consultationData;

  console.log('[createConsultation] Searching for:', { patient_id, consultation_type });

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
    console.log(`[createConsultation] Already active, returning: ${activeRows[0].id}`);
    return activeRows[0];
  }

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
    console.log(`[createConsultation] Reactivating ended session: ${existingChat.id}`);

    // First update
    const { error: updateError } = await supabase
      .from('consultations')
      .update({
        status:   'active',
        ended_at: null,
      })
      .eq('id', existingChat.id);

    if (updateError) {
      console.error('[createConsultation] Update error:', updateError);
      throw new Error(updateError.message);
    }

    // Then fetch fresh to get updated data
    const { data: updated, error: fetchError } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', existingChat.id)
      .single();

    if (fetchError) {
      console.error('[createConsultation] Fetch error:', fetchError);
    }

    // If update succeeded but fetch failed, fetch again
    if (!updated) {
      const { data: retryData } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', existingChat.id)
        .single();
      if (retryData) {
        console.log('[createConsultation] Reactivated (retry):', retryData);
        return retryData;
      }
    }

    console.log('[createConsultation] Reactivated:', updated);
    return updated;
  }

  // ── STEP 3: No history — create a brand new session ───────────────────
  // FIX: Only insert columns that exist in public.consultations:
  //   id (auto), consultation_type, created_by, patient_id,
  //   patient_name, status, created_at, ended_at
  // The frontend also sends patient_role — that column does NOT exist
  // in the table, so spreading consultationData caused the 500.
  console.log(`[createConsultation] Creating new thread for patient: ${patient_id}`);

  const insertPayload = {
    patient_id,
    consultation_type,
    patient_name: consultationData.patient_name || null,
    created_by:   consultationData.created_by   || null,
    status:       'active',
    ended_at:     null,
    created_at:   new Date().toISOString(),
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