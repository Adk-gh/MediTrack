// C:\Users\HP\MediTrack\frontend\src\services\auth.service.js

// Import your initialized Supabase client
// (If your supabase.js uses 'export default supabase', change the brackets to: import supabase from '../supabase')
import { supabase } from '../supabase';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// 1. Made ASYNC: Asks Supabase for the active session (auto-refreshes if expired)
const getAuthHeaders = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Error fetching Supabase session:", error.message);
  }

  const token = session?.access_token;

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
  // 1. Authenticate via your custom backend first
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

    // 2. Establish the Supabase session on the frontend
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: user.token || user.access_token,
      refresh_token: user.refreshToken || user.refresh_token
    });

    if (sessionError) {
      console.error("Failed to set Supabase session on frontend:", sessionError.message);
    }

    // 3. Save purely UI-related user data to localStorage
    // Notice we no longer manually save the 'token' or 'refresh_token' to localStorage!
    // Supabase handles secure token storage automatically behind the scenes.
    localStorage.setItem(
      "user",
      JSON.stringify({
        uid:                user.id || user.uid,
        name:               name,
        firstName:          firstName,
        lastName:           lastName,
        middleName:         middleName,
        suffix:             suffix,
        role:               user.role,
        email:              user.email,
        universityId:       user.university_id || user.universityId || '',
        department:         user.department || user.dept || '',
        program:            user.program || user.classification || '',
        section:            user.section || user.year_level || '',
        vaccinationStatus:  user.vaccination_status || user.vaccinationStatus,
        vaccinationHistory: user.vaccination_history || user.vaccinationHistory,
        emergencyContact:   user.emergency_contact || user.emergencyContact,
        isProfileSetup:     user.is_profile_setup || user.isProfileSetup || false,
      })
    );
  }
  return data;
};

const getProfile = async () => {
  // Await the headers to ensure we have a fresh, valid token from Supabase
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/users/profile`, {
    headers: headers,
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

const logout = async () => {
  // Clear the custom user data from UI state
  localStorage.removeItem("user");

  // Have Supabase securely destroy the session tokens locally and on the server
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out of Supabase:", error.message);
  }
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

const forgotPassword = async (email) => {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to send reset email");
  return data;
};

export default {
  register,
  login,
  getProfile,
  getCurrentUser,
  logout,
  checkIdExists,
  getAuthHeaders,
  forgotPassword,
};