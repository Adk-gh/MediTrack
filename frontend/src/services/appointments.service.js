const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const getAllAppointments = async () => {
  const res = await fetch(`${API_URL}/appointments`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch appointments");
  return data.data;
};

export const getAppointmentsByDate = async (date) => {
  const res = await fetch(`${API_URL}/appointments/date/${date}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch appointments");
  return data.data;
};

export const createAppointment = async (appointmentData) => {
  const res = await fetch(`${API_URL}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(appointmentData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create appointment");
  return data.data;
};

export const updateAppointment = async (id, appointmentData) => {
  const res = await fetch(`${API_URL}/appointments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(appointmentData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update appointment");
  return data.data;
};

export const deleteAppointment = async (id) => {
  const res = await fetch(`${API_URL}/appointments/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete appointment");
  return data;
};

export default { getAllAppointments, getAppointmentsByDate, createAppointment, updateAppointment, deleteAppointment };