// backend/features/consultations/consultations.service.js
const supabase = require('../../configs/database');
const notificationsService = require('../notifications/notifications.service');



const getTargetRolesForConsultation = (consultationType) => {
  const type = (consultationType || '').toLowerCase();
  if (type === 'dental' || type.includes('dent') || type.includes('oral') || type.includes('tooth')) {
    return ['dentist', 'sysadmin'];
  }
  return ['doctor', 'nurse', 'sysadmin'];
};

exports.getAllConsultations = async (consultationType = null, role = null) => {
  let query = supabase
    .from('consultations')
    .select('*')
    .or('is_archived.is.null,is_archived.eq.false')
    .order('created_at', { ascending: false });

  if (consultationType) {
    query = query.eq('consultation_type', consultationType);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[getAllConsultations] Error:', error);
    throw new Error(error.message);
  }
  return data;
};

exports.getConsultationById = async (id) => {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', id)
    .or('is_archived.is.null,is_archived.eq.false')
    .single();

  if (error) throw new Error(error.message);
  return data;
};

exports.getConsultationsByPatient = async (patientId) => {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('patient_id', patientId)
    .or('is_archived.is.null,is_archived.eq.false')
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

  // ── STEP 2: Create new session ───────────────────────────────────────
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

  // ── NOTIFY RELEVANT STAFF (DOCTOR / NURSE / DENTIST / SYSADMIN) ───────
  try {
    const targetRoles = getTargetRolesForConsultation(consultation_type);
    const patientName = consultationData.patient_name || 'A patient';
    const typeLabel = consultation_type === 'dental' ? 'Dental' : 'Medical';

    await notificationsService.notifyRoles(targetRoles, {
      type: 'consultation',
      title: `New ${typeLabel} Consultation`,
      message: `${patientName} started an online ${typeLabel.toLowerCase()} consultation.`,
      referenceId: data.id,
      referenceType: 'consultation',
    });
  } catch (notifyErr) {
    console.error('[createConsultation] Staff notification error:', notifyErr.message);
  }

  return data;
};


exports.updateConsultation = async (id, data) => {
  const updateData = { ...data };
  delete updateData.updated_at;

  console.log('[updateConsultation] Request:', {
    consultationId: id,
    updateData,
  });

  const { data: result, error } = await supabase
    .from('consultations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateConsultation] Database error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      consultationId: id,
      updateData,
    });

    throw new Error(error.message);
  }

  console.log('[updateConsultation] Success:', {
    consultationId: result.id,
    status: result.status,
  });

  return result;
};


exports.endConsultation = async (id) => {
  const result = await exports.updateConsultation(id, {
    status: 'ended',
    ended_at: new Date().toISOString(),
  });

  // ── NOTIFY PATIENT THAT CONSULTATION HAS ENDED ─────────────────────────
  try {
    if (result?.patient_id) {
      await notificationsService.createNotification({
        type: 'consultation_ended',
        title: 'Consultation Ended',
        message: 'Your online consultation session has concluded.',
        userId: result.patient_id,
        referenceId: id,
        referenceType: 'consultation',
      });
    }
  } catch (err) {
    console.error('[endConsultation] Patient notification error:', err.message);
  }

  return result;
};

exports.reactivateConsultation = async (id) => {
  const result = await exports.updateConsultation(id, {
    status: 'active',
    ended_at: null,
  });

  // ── NOTIFY RELEVANT STAFF UPON REACTIVATION ───────────────────────────
  try {
    const targetRoles = getTargetRolesForConsultation(result?.consultation_type);
    const patientName = result?.patient_name || 'A patient';
    const typeLabel = result?.consultation_type === 'dental' ? 'Dental' : 'Medical';

    await notificationsService.notifyRoles(targetRoles, {
      type: 'consultation',
      title: `${typeLabel} Consultation Reopened`,
      message: `${patientName} returned to the online ${typeLabel.toLowerCase()} consultation.`,
      referenceId: result.id,
      referenceType: 'consultation',
    });
  } catch (err) {
    console.error('[reactivateConsultation] Notification error:', err.message);
  }

  return result;
};

exports.deleteConsultation = async (id, deletedBy) => {
  const actor =
    typeof deletedBy === 'string'
      ? deletedBy
      : deletedBy?.email || deletedBy?.id || 'system';

  const { data, error } = await supabase
    .from('consultations')
    .update({
      is_archived: true,
      deleted_by: actor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return { success: true, data };
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
  let internalSenderId = null;

  // Resolve the sender: try Supabase Auth UID first, then fall back to users.id
  if (messageData.sender_id) {
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('uid', messageData.sender_id)
      .maybeSingle();

    if (!user && !userError) {
      ({ data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', messageData.sender_id)
        .maybeSingle());
    }

    if (userError || !user) {
      console.error('[sendMessage] Failed to resolve sender UID:', {
        senderUid: messageData.sender_id,
        error: userError?.message,
      });

      throw new Error('Unable to find the sender in the users table.');
    }

    internalSenderId = user.id;
  }

  const newMessage = {
    consultation_id: consultationId,
    message: messageData.text || messageData.message,
    sender_id: internalSenderId,
    sender_name: messageData.sender_name || null,
    sender_role: messageData.sender_role || null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('consultation_messages')
    .insert(newMessage)
    .select()
    .single();

  if (error) {
    console.error('[sendMessage] Insert failed:', {
      code: error.code,
      message: error.message,
      details: error.details,
      payload: newMessage,
    });

    throw new Error(error.message);
  }

  return data;
};

// Mark messages as read
exports.markMessagesAsRead = async (consultationId, readerId, readerRole) => {
  const { data: unreadMessages, error: fetchError } = await supabase
    .from('consultation_messages')
    .select('id, sender_id, read_at')
    .eq('consultation_id', consultationId)
    .is('read_at', null)
    .not('sender_id', 'is', null);

  if (fetchError) {
    console.error('[markMessagesAsRead] Fetch error:', fetchError);
    throw new Error(fetchError.message);
  }

  if (!unreadMessages || unreadMessages.length === 0) {
    return [];
  }

  const messagesToMark = unreadMessages.filter((msg) => msg.sender_id !== readerId);
  if (messagesToMark.length === 0) return [];
console.log('[READ DEBUG] Consultation:', consultationId);
console.log('[READ DEBUG] Reader ID:', readerId);
console.log('[READ DEBUG] Reader Role:', readerRole);
console.log('[READ DEBUG] Unread messages:', unreadMessages);
console.log('[READ DEBUG] Fetch error:', fetchError);
  const messageIds = messagesToMark.map((msg) => msg.id);

  const { data, error } = await supabase
    .from('consultation_messages')
    .update({ read_at: new Date().toISOString() })
    .in('id', messageIds)
    .select();
    console.log('[READ UPDATE] Message IDs:', messageIds);
console.log('[READ UPDATE] Updated rows:', data);
console.log('[READ UPDATE] Update error:', error);

  if (error) {
    console.error('[markMessagesAsRead] Update error:', error);
    throw new Error(error.message);
  }

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
      user_id: publicUser.id,
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