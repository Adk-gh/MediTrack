//C:\Users\HP\MediTrack\frontend\src\services\appointments.service.js
import { supabase } from '../supabase';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

let allAppointmentsCache = {
  data: null,
  lastFetch: null,
};

let dateAppointmentsCache = {};

const CACHE_TTL_MS = 5 * 60 * 1000;

export const clearAppointmentsCache = (date = null) => {
  if (date) {
    delete dateAppointmentsCache[date];
  } else {
    allAppointmentsCache.data = null;
    allAppointmentsCache.lastFetch = null;
    dateAppointmentsCache = {};
  }
};

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const getAllAppointments = async (forceRefresh = false) => {
  const now = Date.now();

  if (!forceRefresh && allAppointmentsCache.data && allAppointmentsCache.lastFetch && (now - allAppointmentsCache.lastFetch < CACHE_TTL_MS)) {
    console.log('[Appointments] Loaded all appointments instantly from browser cache ⚡');
    return allAppointmentsCache.data;
  }

  console.log('[Appointments] Fetching fresh data from API...');
  const res = await fetch(`${API_URL}/appointments`, {
    headers: await getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch appointments");

  allAppointmentsCache.data = data.data;
  allAppointmentsCache.lastFetch = now;

  return data.data;
};

export const getAppointmentsByDate = async (date, forceRefresh = false) => {
  const now = Date.now();
  const cachedDate = dateAppointmentsCache[date];

  if (!forceRefresh && cachedDate && (now - cachedDate.lastFetch < CACHE_TTL_MS)) {
    console.log(`[Appointments] Loaded date ${date} instantly from browser cache ⚡`);
    return cachedDate.data;
  }

  console.log(`[Appointments] Fetching fresh data for ${date}...`);
  const res = await fetch(`${API_URL}/appointments/date/${date}`, {
    headers: await getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch appointments");

  dateAppointmentsCache[date] = {
    data: data.data,
    lastFetch: now,
  };

  return data.data;
};

export const createAppointment = async (appointmentData) => {
  const res = await fetch(`${API_URL}/appointments`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(appointmentData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create appointment");

  clearAppointmentsCache();

  return data.data;
};

// ── NEW: Faculty bulk appointment request ────────────────────────────────────
// Sends x-user-uid as a fallback identifier, same pattern used by the rest
// of the app (Appointment-users.jsx), in case `authorized` middleware ever
// fails to populate req.user.uid from the bearer token alone.
export const createBulkAppointment = async (payload) => {
  const rawUser = localStorage.getItem('user');
  let uid = null;
  try {
    const parsed = rawUser ? JSON.parse(rawUser) : null;
    uid = parsed?.id || parsed?.uid || null;
  } catch {}

  const headers = await getAuthHeaders();
  if (uid) headers['x-user-uid'] = uid;

  const res = await fetch(`${API_URL}/appointments/bulk`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create bulk appointment");

  clearAppointmentsCache();

  return data.data;
};

export const updateAppointment = async (id, appointmentData) => {
  const res = await fetch(`${API_URL}/appointments/${id}`, {
    method: "PUT",
    headers: await getAuthHeaders(),
    body: JSON.stringify(appointmentData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update appointment");

  clearAppointmentsCache();

  return data.data;
};

export const deleteAppointment = async (id) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const name = localStorage.getItem('name') || '';

  const { error } = await supabase
    .from('appointments')
    .update({
      is_archived: true,
      deleted_by: name || user.email || 'Admin',
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw new Error(error.message || "Failed to archive appointment");

  clearAppointmentsCache();

  return { success: true, id };
};

export default {
  getAllAppointments,
  getAppointmentsByDate,
  createAppointment,
  createBulkAppointment,
  updateAppointment,
  deleteAppointment,
  clearAppointmentsCache
};