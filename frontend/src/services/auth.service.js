const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const register = async (formData) => {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    body: formData, 
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Registration failed");
  return data;
};

const login = async ({ email, password }) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  
  // Save user data to localStorage so getCurrentUser can find it later
  if (data.token) {
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);
  }
  return data;
};

// --- ADD THIS FUNCTION ---
const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  if (userStr) return JSON.parse(userStr);
  return null;
};

const logout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
};

// Make sure to include it in the export object!
export default { 
  register, 
  login, 
  getCurrentUser, 
  logout 
};