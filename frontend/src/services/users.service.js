const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const register = async (formData) => {
  const res = await fetch(`${API_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Registration failed");
  return data.data;
};

export const login = async ({ email, password }) => {
  const res = await fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);

  if (data.data?.token) {
    localStorage.setItem("user", JSON.stringify(data.data));
    localStorage.setItem("token", data.data.token);
  }
  return data.data;
};

export const getProfile = async () => {
  const res = await fetch(`${API_URL}/users/profile`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch profile");
  return data.data;
};

export const firebaseAuth = async (idToken) => {
  const res = await fetch(`${API_URL}/users/firebase-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Firebase auth failed");
  return data.data;
};

export default { register, login, getProfile, firebaseAuth };