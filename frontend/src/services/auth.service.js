// C:\Users\HP\MediTrack\frontend\src\services\auth.service.js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

const register = async (formData) => {
  // Uses FormData for the ID image. Browser sets the Content-Type automatically.
  const res = await fetch(`${API_URL}/user/register`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Registration failed");
  return data;
};

const login = async ({ email, password }) => {
  const res = await fetch(`${API_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);

  if (data.success && data.data) {
    const user = data.data;
    localStorage.setItem(
      "user",
      JSON.stringify({
        uid:                user.id,
        name:               user.name || `${user.firstName} ${user.lastName}`,
        firstName:          user.firstName,
        lastName:           user.lastName,
        middleInitial:      user.middleInitial || '',
        suffix:             user.suffix || '',
        role:               user.role,
        email:              user.email,
        universityId:       user.universityId,
        department:         user.department || user.dept || '',
        program:            user.program || user.classification || '',
        vaccinationStatus:  user.vaccinationStatus,
        vaccinationHistory: user.vaccinationHistory,
        emergencyContact:   user.emergencyContact,
      })
    );
    localStorage.setItem("token", user.token);
  }
  return data;
};

const getProfile = async () => {
  const res = await fetch(`${API_URL}/users/profile`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch profile");
  return data.data;
};

const firebaseAuth = async (idToken) => {
  const res = await fetch(`${API_URL}/users/firebase-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Firebase auth failed");
  return data.data;
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

// --- NEW FUNCTION TO CHECK IF ID EXISTS ---
const checkIdExists = async (universityId) => {
  try {
    const response = await fetch(`${API_URL}/user/check-id?universityId=${universityId}`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    return data.exists; // Expects backend to return { exists: true/false }
  } catch (error) {
    console.error("Error checking ID:", error);
    throw new Error("Failed to verify University ID with the server.");
  }
};

export default {
  register,
  login,
  getProfile,
  firebaseAuth,
  getCurrentUser,
  logout,
  checkIdExists // Don't forget to export it!
};