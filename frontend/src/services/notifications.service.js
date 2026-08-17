//C:\Users\HP\MediTrack\frontend\src\services\notifications.service.js
import { supabase } from '../supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const NOTIF_CACHE_KEY = 'meditrack_notifications';
const NOTIF_COUNT_KEY = 'meditrack_notif_count';

export const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No session token. Please log in again.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const getInternalUserId = async () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const authUid = user?.uid || user?.id;
    if (!authUid) return null;

    const { data: profile, error } = await supabase
      .from('users')
      .select('id')
      .eq('uid', authUid)
      .maybeSingle();

    if (error || !profile) return authUid;
    return profile.id;
  } catch {
    return null;
  }
};

export const getNotifications = async (limit = 20) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSysAdmin = user?.role === 'sysadmin';

  if (isSysAdmin) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications for sysadmin:', error);
      return [];
    }
    return data || [];
  }

  const userId = await getInternalUserId();
  if (!userId) return [];

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

  return data || [];
};

export const getUnreadCount = async () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSysAdmin = user?.role === 'sysadmin';

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);

  // If regular user (doctor, nurse, dentist), filter by user_id
  if (!isSysAdmin) {
    const userId = await getInternalUserId();
    if (!userId) return 0;
    query = query.eq('user_id', userId);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count || 0;
};

export const markAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
  sessionStorage.removeItem(NOTIF_CACHE_KEY);
  sessionStorage.removeItem(NOTIF_COUNT_KEY);
  return { success: true };
};

export const markAllAsRead = async () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSysAdmin = user?.role === 'sysadmin';

  let query = supabase.from('notifications').update({ is_read: true }).eq('is_read', false);

  if (!isSysAdmin) {
    const userId = await getInternalUserId();
    if (!userId) return { success: false };
    query = query.eq('user_id', userId);
  }

  const { error } = await query;
  if (error) throw error;

  sessionStorage.removeItem(NOTIF_CACHE_KEY);
  sessionStorage.removeItem(NOTIF_COUNT_KEY);
  return { success: true };
};

export const deleteNotification = async (notificationId) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/notifications/${notificationId}`, {
    method: 'DELETE',
    headers,
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(result?.message || 'Failed to delete notification');
  }

  sessionStorage.removeItem(NOTIF_CACHE_KEY);
  sessionStorage.removeItem(NOTIF_COUNT_KEY);
  return result;
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getInternalUserId,
};