// C:\Users\HP\MediTrack\frontend\src\services\appointments.service.js

import { supabase } from '../supabase';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let allAppointmentsCache = {
  data: null,
  lastFetch: null,
};

let dateAppointmentsCache = {};

const CACHE_TTL_MS = 5 * 60 * 1000;

// ============================================================
// CACHE
// ============================================================

export const clearAppointmentsCache = (date = null) => {
  if (date) {
    delete dateAppointmentsCache[date];
    return;
  }

  allAppointmentsCache.data = null;
  allAppointmentsCache.lastFetch = null;
  dateAppointmentsCache = {};
};

// ============================================================
// AUTH HEADERS
// ============================================================

const getAuthHeaders = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token =
    session?.access_token ||
    localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

// ============================================================
// RESPONSE HELPER
// ============================================================

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  let result;

  if (contentType.includes('application/json')) {
    result = await response.json();
  } else {
    const text = await response.text();

    result = {
      success: response.ok,
      message: text || 'Unexpected server response',
    };
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
      result?.error ||
      `Request failed with status ${response.status}`
    );
  }

  return result;
};

// ============================================================
// GET ALL APPOINTMENTS
// ============================================================

export const getAllAppointments = async (
  forceRefresh = false
) => {
  const now = Date.now();

  const cacheIsValid =
    allAppointmentsCache.data &&
    allAppointmentsCache.lastFetch &&
    now - allAppointmentsCache.lastFetch < CACHE_TTL_MS;

  if (!forceRefresh && cacheIsValid) {
    console.log(
      '[Appointments] Loaded all appointments instantly from browser cache ⚡'
    );

    return allAppointmentsCache.data;
  }

  console.log(
    '[Appointments] Fetching fresh data from API...'
  );

  const response = await fetch(
    `${API_URL}/appointments`,
    {
      method: 'GET',
      headers: await getAuthHeaders(),
    }
  );

  const result = await parseResponse(response);
  const appointments = result.data ?? [];

  allAppointmentsCache.data = appointments;
  allAppointmentsCache.lastFetch = now;

  return appointments;
};

// ============================================================
// GET APPOINTMENTS BY DATE
// ============================================================

export const getAppointmentsByDate = async (
  date,
  forceRefresh = false
) => {
  if (!date) {
    throw new Error('Appointment date is required');
  }

  const now = Date.now();
  const cachedDate = dateAppointmentsCache[date];

  const cacheIsValid =
    cachedDate &&
    cachedDate.lastFetch &&
    now - cachedDate.lastFetch < CACHE_TTL_MS;

  if (!forceRefresh && cacheIsValid) {
    console.log(
      `[Appointments] Loaded date ${date} instantly from browser cache ⚡`
    );

    return cachedDate.data;
  }

  console.log(
    `[Appointments] Fetching fresh data for ${date}...`
  );

  const response = await fetch(
    `${API_URL}/appointments/date/${encodeURIComponent(date)}`,
    {
      method: 'GET',
      headers: await getAuthHeaders(),
    }
  );

  const result = await parseResponse(response);
  const appointments = result.data ?? [];

  dateAppointmentsCache[date] = {
    data: appointments,
    lastFetch: now,
  };

  return appointments;
};

// ============================================================
// CREATE APPOINTMENT
// ============================================================

export const createAppointment = async (
  appointmentData
) => {
  const response = await fetch(
    `${API_URL}/appointments`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(appointmentData),
    }
  );

  const result = await parseResponse(response);

  clearAppointmentsCache();

  return result.data ?? result;
};

// ============================================================
// CREATE BULK APPOINTMENT
// ============================================================

export const createBulkAppointment = async (
  payload
) => {
  const rawUser = localStorage.getItem('user');

  let uid = null;

  try {
    const parsedUser = rawUser
      ? JSON.parse(rawUser)
      : null;

    uid =
      parsedUser?.uid ||
      parsedUser?.id ||
      null;
  } catch (error) {
    console.warn(
      '[Appointments] Failed to parse stored user:',
      error
    );
  }

  const headers = await getAuthHeaders();

  if (uid) {
    headers['x-user-uid'] = uid;
  }

  const response = await fetch(
    `${API_URL}/appointments/bulk`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }
  );

  const result = await parseResponse(response);

  clearAppointmentsCache();

  return result.data ?? result;
};

// ============================================================
// UPDATE APPOINTMENT
// ============================================================

export const updateAppointment = async (
  appointmentId,
  updates
) => {
  if (!appointmentId) {
    throw new Error('Appointment ID is required');
  }

  /*
   * Do not filter null values here.
   *
   * AppointmentManagement intentionally sends:
   *
   * {
   *   status: 'pending',
   *   year: null,
   *   month: null,
   *   day: null,
   *   time: null
   * }
   *
   * These null values must reach the backend so the existing
   * appointment schedule is cleared from the database.
   */

  const payload = {
    ...updates,
  };

  console.log(
    '[Appointments] Updating appointment:',
    appointmentId,
    payload
  );

  const response = await fetch(
    `${API_URL}/appointments/${appointmentId}`,
    {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  const result = await parseResponse(response);

  clearAppointmentsCache();

  return result.data ?? result;
};

// ============================================================
// DELETE / ARCHIVE APPOINTMENT
// ============================================================

export const deleteAppointment = async (id) => {
  if (!id) {
    throw new Error('Appointment ID is required');
  }

  console.log(
    `[Appointments] Sending archive request to backend for ID: ${id}`
  );

  const response = await fetch(
    `${API_URL}/appointments/${id}`,
    {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    }
  );

  const result = await parseResponse(response);

  clearAppointmentsCache();

  return result.data ?? {
    success: true,
    id,
  };
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  getAllAppointments,
  getAppointmentsByDate,
  createAppointment,
  createBulkAppointment,
  updateAppointment,
  deleteAppointment,
  clearAppointmentsCache,
};