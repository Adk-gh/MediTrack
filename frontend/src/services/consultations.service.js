// C:\Users\HP\MediTrack\frontend\src\services\consultations.service.js
import { supabase } from '../supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── FRONTEND CACHE STATE ──────────────────────────────────────────────
let consultationsCache = {
  data: null,
  lastFetch: null,
};
let messagesCache = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const clearConsultationsCache = () => {
  consultationsCache.data = null;
  consultationsCache.lastFetch = null;
};

export const clearMessagesCache = (consultationId = null) => {
  if (consultationId) {
    delete messagesCache[consultationId];
  } else {
    messagesCache = {};
  }
};

// ── API CALL HELPER ───────────────────────────────────────────────────
// Centralizes the fetch logic so we don't have to repeat headers every time
const fetchApi = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || result.message || 'API request failed');
  return result.data; // Assumes your backend sends res.json({ success: true, data: ... })
};


// ============================================================
// CONSULTATIONS (Now routed through Node.js Backend)
// ============================================================

export const getAllConsultations = async (consultationType = null, forceRefresh = false) => {
  const now = Date.now();

  if (!forceRefresh && !consultationType && consultationsCache.data && consultationsCache.lastFetch && (now - consultationsCache.lastFetch < CACHE_TTL_MS)) {
    console.log('[Consultations] Loaded instantly from browser cache ⚡');
    return consultationsCache.data;
  }

  console.log('[Consultations] Fetching fresh data from Backend...');
  const endpoint = consultationType ? `/consultations?type=${consultationType}` : '/consultations';
  const data = await fetchApi(endpoint);

  if (!consultationType) {
    consultationsCache.data = data;
    consultationsCache.lastFetch = now;
  }

  return data;
};

export const getConsultationById = async (id) => {
  if (consultationsCache.data) {
    const cachedItem = consultationsCache.data.find(c => c.id === id);
    if (cachedItem) return cachedItem;
  }
  return await fetchApi(`/consultations/${id}`);
};

export const createConsultation = async (consultationData) => {
  // This now hits your backend, triggering both the Audit Log AND Notification!
  const data = await fetchApi('/consultations', {
    method: 'POST',
    body: JSON.stringify(consultationData)
  });

  clearConsultationsCache();
  return data;
};

export const updateConsultation = async (id, data) => {
  const result = await fetchApi(`/consultations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });

  clearConsultationsCache();
  return result;
};

export const endConsultation = async (id) => {
  const result = await fetchApi(`/consultations/${id}/end`, {
    method: 'PUT' // Assuming you create a specific /:id/end route, or use the update endpoint
  });
  clearConsultationsCache();
  return result;
};

export const deleteConsultation = async (id) => {
  // Get current user info for deleted_by
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const name = localStorage.getItem('name') || '';

  // Instead of deleting, set is_archived to true
  const { error } = await supabase
    .from('consultations')
    .update({
      is_archived: true,
      deleted_by: name || user.email || 'Admin',
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw new Error(error.message || "Failed to archive consultation");
  clearConsultationsCache();
  return { success: true, id };
};


// ============================================================
// MESSAGES (Now routed through Node.js Backend)
// ============================================================

export const getMessagesByConsultationId = async (consultationId, forceRefresh = false) => {
  const now = Date.now();
  const cachedRoom = messagesCache[consultationId];

  if (!forceRefresh && cachedRoom && (now - cachedRoom.lastFetch < CACHE_TTL_MS)) {
    console.log(`[Messages] Loaded room ${consultationId} instantly from browser cache ⚡`);
    return cachedRoom.data;
  }

  console.log(`[Messages] Fetching fresh messages for room ${consultationId}...`);
  const data = await fetchApi(`/consultations/${consultationId}/messages`);

  messagesCache[consultationId] = {
    data: data,
    lastFetch: now,
  };

  return data;
};

export const sendMessage = async (consultationId, messageData) => {
  const data = await fetchApi(`/consultations/${consultationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(messageData)
  });

  clearMessagesCache(consultationId);
  return data;
};


// ============================================================
// PRESENCE (Now routed through Node.js Backend)
// ============================================================

export const setUserPresence = async (userId, status = 'online') => {
  return await fetchApi('/consultations/presence', {
    method: 'POST',
    body: JSON.stringify({ status })
  });
};

export const getOnlineUsers = async () => {
  return await fetchApi('/consultations/presence/online');
};


// ============================================================
// REALTIME SUBSCRIPTIONS (Kept as Direct Supabase Listeners!)
// ============================================================
// These don't write data, they just listen. So they bypass the backend perfectly.

export const subscribeToConsultations = (callback) => {
  const channel = supabase
    .channel(`consultations-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, (payload) => {
      clearConsultationsCache();
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
  getAllConsultations, getConsultationById, createConsultation, updateConsultation, endConsultation, deleteConsultation, clearConsultationsCache,
  getMessagesByConsultationId, sendMessage, clearMessagesCache,
  subscribeToConsultations, subscribeToMessages, subscribeToConsultationStatus,
  setUserPresence, getOnlineUsers, subscribeToPresence,
};