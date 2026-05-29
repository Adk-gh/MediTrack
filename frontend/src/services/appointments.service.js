//C:\Users\HP\MediTrack\frontend\src\services\appointments.service.js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ── FRONTEND CACHE STATE ──────────────────────────────────────────────
let allAppointmentsCache = {
  data: null,
  lastFetch: null,
};

// Dictionary to store appointments by specific dates (e.g., '2026-05-29')
let dateAppointmentsCache = {};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const clearAppointmentsCache = (date = null) => {
  if (date) {
    delete dateAppointmentsCache[date]; // Clear specific date
  } else {
    allAppointmentsCache.data = null;
    allAppointmentsCache.lastFetch = null;
    dateAppointmentsCache = {}; // Clear everything
  }
};
// ──────────────────────────────────────────────────────────────────────

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const getAllAppointments = async (forceRefresh = false) => {
  const now = Date.now();

  // 1. Check cache for the master list
  if (!forceRefresh && allAppointmentsCache.data && allAppointmentsCache.lastFetch && (now - allAppointmentsCache.lastFetch < CACHE_TTL_MS)) {
    console.log('[Appointments] Loaded all appointments instantly from browser cache ⚡');
    return allAppointmentsCache.data;
  }

  console.log('[Appointments] Fetching fresh data from API...');
  const res = await fetch(`${API_URL}/appointments`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch appointments");

  // 2. Save to cache
  allAppointmentsCache.data = data.data;
  allAppointmentsCache.lastFetch = now;

  return data.data;
};

export const getAppointmentsByDate = async (date, forceRefresh = false) => {
  const now = Date.now();
  const cachedDate = dateAppointmentsCache[date];

  // 1. Check if this specific date is cached
  if (!forceRefresh && cachedDate && (now - cachedDate.lastFetch < CACHE_TTL_MS)) {
    console.log(`[Appointments] Loaded date ${date} instantly from browser cache ⚡`);
    return cachedDate.data;
  }

  console.log(`[Appointments] Fetching fresh data for ${date}...`);
  const res = await fetch(`${API_URL}/appointments/date/${date}`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch appointments");

  // 2. Save the date array into the dictionary
  dateAppointmentsCache[date] = {
    data: data.data,
    lastFetch: now,
  };

  return data.data;
};

export const createAppointment = async (appointmentData) => {
  const res = await fetch(`${API_URL}/appointments`, {
    method: "POST",
    headers: getAuthHeaders(), // Fixed: Added auth headers here
    body: JSON.stringify(appointmentData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create appointment");

  // Clear all caches so the new appointment immediately shows up everywhere
  clearAppointmentsCache();

  return data.data;
};

export const updateAppointment = async (id, appointmentData) => {
  const res = await fetch(`${API_URL}/appointments/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(), // Fixed: Added auth headers here
    body: JSON.stringify(appointmentData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update appointment");

  // Clear caches so the edits show up immediately
  clearAppointmentsCache();

  return data.data;
};

export const deleteAppointment = async (id) => {
  const res = await fetch(`${API_URL}/appointments/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete appointment");

  // Clear caches to remove the deleted item
  clearAppointmentsCache();

  return data;
};

export default {
  getAllAppointments,
  getAppointmentsByDate,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  clearAppointmentsCache
};