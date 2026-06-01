import { supabase } from '../supabase';

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

// ── Get user ID from profile cache ───────────────────────────────────────────
const getUserId = () => {
  try {
    const profile = JSON.parse(sessionStorage.getItem('meditrack_user_profile') || 'null');
    if (profile?.internalUserId) return profile.internalUserId;
    // Fallback to localStorage user
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.id || null;
  } catch { return null; }
};

// ── API Functions ──────────────────────────────────────────────────────────────
export const getNotifications = async (limit = 20) => {
  const userId = getUserId();
  if (!userId) return [];

  // Try cache first
  const cached = getCachedNotifications();
  if (cached) return cached;

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

  setCachedNotifications(data || []);
  return data || [];
};

export const getUnreadCount = async () => {
  const userId = getUserId();
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
  const userId = getUserId();
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

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
};