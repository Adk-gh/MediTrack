// C:\Users\HP\MediTrack\frontend\src\services\announcements.service.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const getAllAnnouncements = async () => {
  const response = await fetch(`${API_URL}/announcements`, {
    headers: getAuthHeaders()
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'Failed to fetch announcements');
  return result.data;
};

export const getAnnouncementById = async (id) => {
  const response = await fetch(`${API_URL}/announcements/${id}`, {
    headers: getAuthHeaders()
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'Failed to fetch announcement');
  return result.data;
};

export const createAnnouncement = async (payload) => {
  const response = await fetch(`${API_URL}/announcements`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'Failed to create announcement');
  return result.data;
};

export const updateAnnouncement = async (id, payload) => {
  const response = await fetch(`${API_URL}/announcements/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'Failed to update announcement');
  return result.data;
};

export const deleteAnnouncement = async (id) => {
  const response = await fetch(`${API_URL}/announcements/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'Failed to archive announcement');
  return { id };
};

export default {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};