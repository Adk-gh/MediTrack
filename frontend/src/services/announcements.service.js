const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const getAllAnnouncements = async () => {
  const res = await fetch(`${API_URL}/announcements`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch announcements");
  return data.data;
};

export const getAnnouncementById = async (id) => {
  const res = await fetch(`${API_URL}/announcements/${id}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch announcement");
  return data.data;
};

export const createAnnouncement = async (announcementData) => {
  const res = await fetch(`${API_URL}/announcements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(announcementData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create announcement");
  return data.data;
};

export const updateAnnouncement = async (id, announcementData) => {
  const res = await fetch(`${API_URL}/announcements/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(announcementData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update announcement");
  return data.data;
};

export const deleteAnnouncement = async (id) => {
  const res = await fetch(`${API_URL}/announcements/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete announcement");
  return data;
};

export default { getAllAnnouncements, getAnnouncementById, createAnnouncement, updateAnnouncement, deleteAnnouncement };