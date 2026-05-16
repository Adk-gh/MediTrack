const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export const getNotifications = async (limit = 20) => {
  const res = await fetch(`${API_URL}/notifications?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch notifications');
  return data.data;
};

export const getUnreadCount = async () => {
  const res = await fetch(`${API_URL}/notifications/unread-count`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch unread count');
  return data.data;
};

export const markAsRead = async (notificationId) => {
  const res = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to mark as read');
  return data;
};

export const markAllAsRead = async () => {
  const res = await fetch(`${API_URL}/notifications/read-all`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to mark all as read');
  return data;
};

export const deleteNotification = async (notificationId) => {
  const res = await fetch(`${API_URL}/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete notification');
  return data;
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};