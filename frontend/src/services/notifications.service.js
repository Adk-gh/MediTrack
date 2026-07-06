import { supabase } from '../supabase';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Cache key for notifications
const NOTIF_CACHE_KEY = 'meditrack_notifications';
const NOTIF_COUNT_KEY = 'meditrack_notif_count';
const NOTIF_CACHE_TTL = 60000; // 1 minute

// ── Cache Helpers ──────────────────────────────────────────────────────────────
const getCachedNotifications = () => {
  try {
    const cached = sessionStorage.getItem(NOTIF_CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > NOTIF_CACHE_TTL) return null;
    return data;
  } catch { return null; }
};

const setCachedNotifications = (data) => {
  try {
    sessionStorage.setItem(NOTIF_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
};

const getCachedUnreadCount = () => {
  try {
    const cached = sessionStorage.getItem(NOTIF_COUNT_KEY);
    if (!cached) return null;
    const { count, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > NOTIF_CACHE_TTL) return null;
    return count;
  } catch { return null; }
};

const setCachedUnreadCount = (count) => {
  try {
    sessionStorage.setItem(NOTIF_COUNT_KEY, JSON.stringify({ count, timestamp: Date.now() }));
  } catch {}
};

// ── Get user ID for notifications ───────────────────────────────────────────
// NOTE: Notifications use the internal users.id (UUID), not Supabase Auth uid
// We need to query the internal ID from the Supabase Auth uid
const getUserId = async () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const authUid = user?.uid || user?.id;

    console.log('[Notifications] User auth uid:', authUid);

    if (!authUid) return null;

    // Look up the internal user ID from the auth UID
    const { data: profile, error } = await supabase
      .from('users')
      .select('id')
      .eq('uid', authUid)
      .single();

    if (error) {
      console.error('[Notifications] Error looking up user:', error);
      return null;
    }

    console.log('[Notifications] Internal user id:', profile?.id);
    return profile?.id || null;
  } catch (e) {
    console.error('[Notifications] Error getting user ID:', e);
    return null;
  }
};

// ── API Functions ──────────────────────────────────────────────────────────────
export const getNotifications = async (limit = 20) => {
  const userId = await getUserId();
  console.log('[Notifications Frontend] Getting notifications for internal userId:', userId);
  if (!userId) {
    console.warn('[Notifications] No userId found, returning empty array');
    // Debug: show what's in localStorage
    const userStr = localStorage.getItem('user');
    console.log('[Notifications] Raw localStorage user:', userStr);
    alert('No userId found. Check console for details.');
    return [];
  }

  // First, let's see ALL notifications in the database (for debugging)
  console.log('[Notifications] Fetching ALL notifications from database...');
  const { data: allNotifs, error: allError } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (allError) {
    console.error('[Notifications] Error fetching all notifications:', allError);
  } else {
    console.log('[Notifications] ALL notifications in DB (first 10):', allNotifs);
    console.log('[Notifications] Looking for user_id:', userId);

    // If we found notifications, show the user_ids
    if (allNotifs && allNotifs.length > 0) {
      console.log('[Notifications] User IDs in DB:', allNotifs.map(n => n.user_id));
    }
  }

  // Now query for specific user
  console.log('[Notifications] Querying for user_id:', userId);

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  console.log('[Notifications] Found notifications for user:', data?.length, 'items');
  if (data?.length > 0) {
    console.log('[Notifications] Sample notification:', data[0]);
  }

  // setCachedNotifications(data || []);
  return data || [];
};

export const getUnreadCount = async () => {
  const userId = await getUserId();
  if (!userId) return 0;

  // Try cache first
  const cachedCount = getCachedUnreadCount();
  if (cachedCount !== null) return cachedCount;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  setCachedUnreadCount(count || 0);
  return count || 0;
};

export const markAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking as read:', error);
    throw error;
  }

  // Invalidate cache
  sessionStorage.removeItem(NOTIF_CACHE_KEY);
  sessionStorage.removeItem(NOTIF_COUNT_KEY);
  return { success: true };
};

export const markAllAsRead = async () => {
  const userId = await getUserId();
  if (!userId) return { success: false };

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }

  // Invalidate cache
  sessionStorage.removeItem(NOTIF_CACHE_KEY);
  sessionStorage.removeItem(NOTIF_COUNT_KEY);
  return { success: true };
};

export const deleteNotification = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }

  // Invalidate cache
  sessionStorage.removeItem(NOTIF_CACHE_KEY);
  sessionStorage.removeItem(NOTIF_COUNT_KEY);
  return { success: true };
};

// ── Create Notification (for backend/other services to use) ───────────────────
export const createNotification = async (notification) => {
  const { error } = await supabase
    .from('notifications')
    .insert(notification);

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  // Invalidate cache
  sessionStorage.removeItem(NOTIF_CACHE_KEY);
  sessionStorage.removeItem(NOTIF_COUNT_KEY);
  return { success: true };
};

// ── Test function to create a notification ───────────────────────────────
export const createTestNotification = async () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const authUid = user?.uid;

  if (!authUid) {
    alert('No user found. Please log in again.');
    return;
  }

  console.log('[Test] Creating test notification via API for auth uid:', authUid);

  // Get auth headers
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    alert('No session token. Please log in again.');
    return;
  }

  // Use backend API to create notification
  try {
    console.log('[Test] Calling API:', `${API_URL}/notifications/test`);
    console.log('[Test] Auth token:', token ? 'present' : 'missing');

    const response = await fetch(`${API_URL}/notifications/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: authUid,
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test notification!',
      }),
    });

    console.log('[Test] Response status:', response.status);

    const text = await response.text();
    console.log('[Test] Raw response:', text.substring(0, 200));

    // Check if it's HTML (error page)
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      console.error('[Test] Got HTML response instead of JSON - likely a server error page');
      alert('Server error. Check console for details.');
      return;
    }

    const result = JSON.parse(text);

    if (!response.ok) {
      console.error('[Test] API Error:', result);
      alert('Error: ' + result.message);
      return;
    }

    console.log('[Test] Notification created via API:', result);
    alert('Test notification created!');

    // Clear cache so next fetch gets fresh data
    sessionStorage.removeItem('meditrack_notifications');
    sessionStorage.removeItem('meditrack_notif_count');
  } catch (err) {
    console.error('[Test] Error:', err);
    alert('Error creating notification: ' + err.message);
  }
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  createTestNotification,
};