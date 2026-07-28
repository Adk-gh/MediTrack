// C:\Users\HP\MediTrack\frontend\src\services\token.service.js
// Centralized Token Management Service
// Handles automatic token refresh for the entire application

import { supabase } from '../supabase';

let tokenRefreshInterval = null;
let isRefreshing = false;
let refreshPromise = null;

// Check if token is expired
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds; subtract 30s so we refresh slightly early
    return Date.now() / 1000 > payload.exp - 30;
  } catch {
    return true;
  }
};

// Get valid token - either from current session or by refreshing
export const getValidToken = async () => {
  // If already refreshing, wait for that promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  try {
    // First check Supabase's current session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.warn('[TokenMgr] Session error:', error.message);
      return localStorage.getItem('token');
    }

    if (session?.access_token) {
      // Session is valid - sync with localStorage
      localStorage.setItem('token', session.access_token);
      if (session.refresh_token) {
        localStorage.setItem('refresh_token', session.refresh_token);
      }
      // Update realtime auth
      try { supabase.realtime.setAuth(session.access_token); } catch {}
      return session.access_token;
    }

    // No session - try to refresh using stored tokens
    const accessToken = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refresh_token') || '';

    if (!accessToken) {
      return null;
    }

    // Check if token is still valid
    if (!isTokenExpired(accessToken)) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      try { supabase.realtime.setAuth(accessToken); } catch {}
      return accessToken;
    }

    // Token expired - refresh it
    console.log('[TokenMgr] Token expired, refreshing...');
    return refreshTokenInternal();
  } catch (err) {
    console.error('[TokenMgr] getValidToken error:', err);
    return localStorage.getItem('token');
  }
};

// Internal refresh function
const refreshTokenInternal = async () => {
  if (isRefreshing) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();

      if (!refreshErr && refreshed?.session) {
        const newAccess = refreshed.session.access_token;
        const newRefresh = refreshed.session.refresh_token;

        localStorage.setItem('token', newAccess);
        if (newRefresh) {
          localStorage.setItem('refresh_token', newRefresh);
        }

        try { supabase.realtime.setAuth(newAccess); } catch {}
        console.log('[TokenMgr] Token refreshed successfully');
        return newAccess;
      }

      console.warn('[TokenMgr] Token refresh failed:', refreshErr?.message);
      return null;
    } catch (err) {
      console.error('[TokenMgr] Token refresh error:', err);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Start the automatic token refresh interval
// Call this once when the app initializes (e.g., in App.jsx after login)
export const startTokenRefresh = (intervalMs = 10 * 60 * 1000) => {
  // Don't start multiple intervals
  if (tokenRefreshInterval) {
    console.log('[TokenMgr] Refresh interval already running');
    return;
  }

  console.log('[TokenMgr] Starting automatic token refresh every', intervalMs / 1000, 'seconds');

  // Initial refresh
  getValidToken();

  // Set up interval
  tokenRefreshInterval = setInterval(async () => {
    console.log('[TokenMgr] Running scheduled token refresh');
    await getValidToken();
  }, intervalMs);
};

// Stop the automatic token refresh interval
// Call this on logout
export const stopTokenRefresh = () => {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
    console.log('[TokenMgr] Stopped token refresh');
  }
};

// Ensure valid token before making API calls
// Use this wrapper for any fetch calls that need auth
export const ensureValidToken = async () => {
  return getValidToken();
};

// Get auth headers for API calls
export const getAuthHeaders = async () => {
  const token = await getValidToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export default {
  getValidToken,
  startTokenRefresh,
  stopTokenRefresh,
  ensureValidToken,
  getAuthHeaders,
};
