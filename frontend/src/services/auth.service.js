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
  const res = await fetch(`${API_URL}/auth/register`, {
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
  console.log('Login response:', res.status, data);
  if (!res.ok) throw new Error(data.message);

  if (data.success && data.data) {
    const user = data.data;

    // Safely extract names supporting both Supabase snake_case and old camelCase
    const firstName = user.first_name || user.firstName || '';
    const lastName = user.last_name || user.lastName || '';
    const middleName = user.middle_name || user.middleName || '';
    const suffix = user.suffix || '';
    const name = user.name || `${firstName} ${lastName}`.trim();

    localStorage.setItem(
      "user",
      JSON.stringify({
        uid:                user.id || user.uid, // Supabase PK is usually 'id'
        name:               name,
        firstName:          firstName,
        lastName:           lastName,
        middleName:         middleName,
        suffix:             suffix,
        role:               user.role,
        email:              user.email,

        // Ensure we check for the new Supabase snake_case columns!
        universityId:       user.university_id || user.universityId || '',
        department:         user.department || user.dept || '',
        program:            user.program || user.classification || '',
        section:            user.section || user.year_level || '', // Added section!

        vaccinationStatus:  user.vaccination_status || user.vaccinationStatus,
        vaccinationHistory: user.vaccination_history || user.vaccinationHistory,
        emergencyContact:   user.emergency_contact || user.emergencyContact,
        isProfileSetup:     user.is_profile_setup || user.isProfileSetup || false,

        // Preserve tokens inside the object if other components rely on them
        token:              user.token || user.access_token,
        refreshToken:       user.refreshToken || user.refresh_token
      })
    );

    // ✅ token is already the Supabase JWT — save it for session restore
    localStorage.setItem("token", user.token || user.access_token);

    // ✅ Save refresh token so Supabase can renew the session automatically
    if (user.refreshToken || user.refresh_token) {
      localStorage.setItem("refresh_token", user.refreshToken || user.refresh_token);
    }
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

const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  if (userStr) return JSON.parse(userStr);
  return null;
};

const logout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token"); // ✅ clear refresh token on logout
};

const checkIdExists = async (universityId) => {
  try {
    const response = await fetch(`${API_URL}/user/check-id?universityId=${universityId}`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error("Error checking ID:", error);
    throw new Error("Failed to verify University ID with the server.");
  }
};

export default {
  register,
  login,
  getProfile,
  getCurrentUser,
  logout,
  checkIdExists,
};