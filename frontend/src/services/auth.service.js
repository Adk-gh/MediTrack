const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const register = async (formData) => {
  // FormData with image — do NOT set Content-Type, browser handles it
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

  if (data.token) {
    localStorage.setItem(
      "user",
      JSON.stringify({
        uid:          data.user.uid,
        name:         data.user.name,
        role:         data.user.role,
        email:        data.user.email,
        universityId: data.user.universityId,
      })
    );
    localStorage.setItem("token", data.token);
  }

  return data;
};

const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  if (userStr) return JSON.parse(userStr);
  return null;
};

const logout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
};

export default { register, login, getCurrentUser, logout };