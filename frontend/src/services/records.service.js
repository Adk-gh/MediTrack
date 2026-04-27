const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const getAllRecords = async () => {
  const res = await fetch(`${API_URL}/records`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch records");
  return data.data;
};

export const getRecordById = async (id) => {
  const res = await fetch(`${API_URL}/records/${id}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch record");
  return data.data;
};

export const createRecord = async (recordData) => {
  const res = await fetch(`${API_URL}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recordData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create record");
  return data.data;
};

export const updateRecord = async (id, recordData) => {
  const res = await fetch(`${API_URL}/records/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recordData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update record");
  return data.data;
};

export const deleteRecord = async (id) => {
  const res = await fetch(`${API_URL}/records/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete record");
  return data;
};

export default { getAllRecords, getRecordById, createRecord, updateRecord, deleteRecord };