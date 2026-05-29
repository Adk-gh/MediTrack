// C:\Users\HP\MediTrack\frontend\src\services\consultations.service.js
import { supabase } from '../supabase';

// ── FRONTEND CACHE STATE ──────────────────────────────────────────────
let consultationsCache = {
  data: null,
  lastFetch: null,
};

// Dictionary to store messages by room ID
let messagesCache = {};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const clearConsultationsCache = () => {
  consultationsCache.data = null;
  consultationsCache.lastFetch = null;
};

export const clearMessagesCache = (consultationId = null) => {
  if (consultationId) {
    delete messagesCache[consultationId]; // Clear specific room
  } else {
    messagesCache = {}; // Clear all rooms
  }
};
// ──────────────────────────────────────────────────────────────────────

// ============================================================
// CONSULTATIONS
// ============================================================

export const getAllConsultations = async (consultationType = null, forceRefresh = false) => {
  const now = Date.now();

  // 1. Check cache for the master list
  if (!forceRefresh && !consultationType && consultationsCache.data && consultationsCache.lastFetch && (now - consultationsCache.lastFetch < CACHE_TTL_MS)) {
    console.log('[Consultations] Loaded instantly from browser cache ⚡');
    return consultationsCache.data;
  }

  console.log('[Consultations] Fetching fresh data from Supabase...');
  let query = supabase
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false });

  if (consultationType) {
    query = query.eq('consultation_type', consultationType);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Failed to fetch consultations');

  // Cache the master list (only if it's not filtered by type)
  if (!consultationType) {
    consultationsCache.data = data;
    consultationsCache.lastFetch = now;
  }

  return data;
};

export const getConsultationById = async (id) => {
  // Check master list cache first
  if (consultationsCache.data) {
    const cachedItem = consultationsCache.data.find(c => c.id === id);
    if (cachedItem) return cachedItem;
  }

  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message || 'Failed to fetch consultation');
  return data;
};

export const createConsultation = async (consultationData) => {
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

  if (error) throw new Error(error.message || 'Failed to create consultation');

  clearConsultationsCache(); // Invalidate cache so the new room shows up
  return data;
};

export const updateConsultation = async (id, data) => {
  const updateData = { ...data };

  // Prevent the frontend from injecting the ghost column
  delete updateData.updated_at;

  const { data: result, error } = await supabase
    .from('consultations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to update consultation');

  clearConsultationsCache(); // Invalidate cache
  return result;
};

export const endConsultation = async (id) => {
  return updateConsultation(id, { status: 'ended', ended_at: new Date().toISOString() });
};

// ============================================================
// MESSAGES
// ============================================================

export const getMessagesByConsultationId = async (consultationId, forceRefresh = false) => {
  const now = Date.now();
  const cachedRoom = messagesCache[consultationId];

  // 1. Check if this specific chat room's messages are cached
  if (!forceRefresh && cachedRoom && (now - cachedRoom.lastFetch < CACHE_TTL_MS)) {
    console.log(`[Messages] Loaded room ${consultationId} instantly from browser cache ⚡`);
    return cachedRoom.data;
  }

  console.log(`[Messages] Fetching fresh messages for room ${consultationId}...`);
  const { data, error } = await supabase
    .from('consultation_messages')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message || 'Failed to fetch messages');

  // 2. Save the messages array into the dictionary using the room ID as the key
  messagesCache[consultationId] = {
    data: data,
    lastFetch: now,
  };

  return data;
};

export const sendMessage = async (consultationId, messageData) => {
  const newMessage = {
    consultation_id: consultationId,
    message: messageData.text || messageData.message,
    sender_id: messageData.sender_id,
    sender_name: messageData.sender_name,
    sender_role: messageData.sender_role,
    // 'is_bot' has been completely removed to match your database schema
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('consultation_messages')
    .insert(newMessage)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to send message');

  // Clear the cache for THIS specific room so the sender instantly sees their message on refresh
  clearMessagesCache(consultationId);

  return data;
};

// ============================================================
// REALTIME SUBSCRIPTIONS
// ============================================================

export const subscribeToConsultations = (callback) => {
  const channel = supabase
    .channel(`consultations-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, (payload) => {
      clearConsultationsCache(); // Clear cache if a background update happens
      callback(payload);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
};

export const subscribeToMessages = (consultationId, callback) => {
  const channel = supabase
    .channel(`messages-${consultationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'consultation_messages',
      filter: `consultation_id=eq.${consultationId}`,
    }, (payload) => {
      // Clear cache when someone else sends a message so it doesn't stay stale
      clearMessagesCache(consultationId);
      callback(payload.new);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
};

export const subscribeToConsultationStatus = (consultationId, callback) => {
  const channel = supabase
    .channel(`consultation-status-${consultationId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'consultations',
      filter: `id=eq.${consultationId}`,
    }, (payload) => {
      clearConsultationsCache();
      callback(payload.new);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
};

// ============================================================
// PRESENCE (Online Status)
// ============================================================

export const setUserPresence = async (userId, status = 'online') => {
  const { data, error } = await supabase
    .from('presence')
    .upsert({
      user_id: userId,
      status,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to update presence');
  return data;
};

export const getOnlineUsers = async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('presence')
    .select('*')
    .gte('last_seen', fiveMinutesAgo)
    .eq('status', 'online');

  if (error) throw new Error(error.message || 'Failed to fetch presence');
  return data;
};

export const subscribeToPresence = (callback) => {
  const channel = supabase
    .channel(`presence-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
};

export default {
  // Consultations
  getAllConsultations,
  getConsultationById,
  createConsultation,
  updateConsultation,
  endConsultation,
  clearConsultationsCache,
  // Messages
  getMessagesByConsultationId,
  sendMessage,
  clearMessagesCache,
  // Realtime
  subscribeToConsultations,
  subscribeToMessages,
  subscribeToConsultationStatus,
  // Presence
  setUserPresence,
  getOnlineUsers,
  subscribeToPresence,
};