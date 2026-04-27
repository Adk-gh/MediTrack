const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const getAllExaminations = async () => {
  const res = await fetch(`${API_URL}/examinations`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch examinations");
  return data.data;
};

export const getExaminationById = async (id) => {
  const res = await fetch(`${API_URL}/examinations/${id}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch examination");
  return data.data;
};

export const createExamination = async (examinationData) => {
  const res = await fetch(`${API_URL}/examinations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(examinationData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create examination");
  return data.data;
};

export const updateExamination = async (id, examinationData) => {
  const res = await fetch(`${API_URL}/examinations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(examinationData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update examination");
  return data.data;
};

export const deleteExamination = async (id) => {
  const res = await fetch(`${API_URL}/examinations/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete examination");
  return data;
};

export default { getAllExaminations, getExaminationById, createExamination, updateExamination, deleteExamination };