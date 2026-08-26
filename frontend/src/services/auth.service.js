// C:\Users\HP\MediTrack\frontend\src\services\auth.service.js

import { supabase } from "../supabase";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================================
// HELPERS
// ============================================================

const clearAppUserState = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("role");
  localStorage.removeItem("uid");
  localStorage.removeItem("name");
  localStorage.removeItem("_internalUserId");
  localStorage.removeItem("_internalStaffId");
};

const normalizeUser = (user) => {
  if (!user) return null;

  const firstName = user.first_name || user.firstName || "";
  const lastName = user.last_name || user.lastName || "";
  const middleName = user.middle_name || user.middleName || "";
  const suffix = user.suffix || "";

  const name =
    user.name ||
    `${firstName} ${lastName}`.trim();

  return {
    uid: user.id || user.uid,

    name,

    firstName,
    lastName,
    middleName,
    suffix,

    role: user.role || "",

    email: user.email || "",

    universityId:
      user.university_id ||
      user.universityId ||
      "",

    department:
      user.department ||
      user.dept ||
      "",

    program:
      user.program ||
      user.classification ||
      "",

    section:
      user.section ||
      user.year_level ||
      "",

    vaccinationStatus:
      user.vaccination_status ||
      user.vaccinationStatus,

    vaccinationHistory:
      user.vaccination_history ||
      user.vaccinationHistory,

    emergencyContact:
      user.emergency_contact ||
      user.emergencyContact,

    isProfileSetup:
      user.is_profile_setup ||
      user.isProfileSetup ||
      false,
  };
};

const saveCurrentUser = (user) => {
  const normalizedUser = normalizeUser(user);

  if (!normalizedUser) {
    localStorage.removeItem("user");
    return null;
  }

  localStorage.setItem(
    "user",
    JSON.stringify(normalizedUser)
  );

  return normalizedUser;
};

// ============================================================
// GET AUTH HEADERS
// ============================================================

const getAuthHeaders = async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error(
        "[Auth] Error fetching Supabase session:",
        error.message
      );

      return {
        "Content-Type": "application/json",
        Authorization: "",
      };
    }

    const token = session?.access_token;

    return {
      "Content-Type": "application/json",
      Authorization: token
        ? `Bearer ${token}`
        : "",
    };
  } catch (error) {
    console.error(
      "[Auth] Unexpected getSession error:",
      error
    );

    return {
      "Content-Type": "application/json",
      Authorization: "",
    };
  }
};

// ============================================================
// CLEAR SUPABASE LOCAL SESSION
// ============================================================
//
// IMPORTANT:
// We use scope: "local" when switching accounts.
//
// This clears the browser's current Supabase session without
// unnecessarily revoking the previous account's refresh token
// on the server.
//
// This helps prevent Account A's session from racing with
// Account B's login.
//

const clearSupabaseLocalSession = async () => {
  try {
    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      console.warn(
        "[Auth] Could not clear local Supabase session:",
        error.message
      );
    }
  } catch (error) {
    console.warn(
      "[Auth] Local Supabase session cleanup failed:",
      error
    );
  }
};

// ============================================================
// REGISTER
// ============================================================

const register = async (formData) => {
  const res = await fetch(
    `${API_URL}/auth/register`,
    {
      method: "POST",
      body: formData,
    }
  );

  let data;

  try {
    data = await res.json();
  } catch {
    throw new Error(
      "Invalid response from registration server."
    );
  }

  if (!res.ok) {
    throw new Error(
      data.message || "Registration failed"
    );
  }

  return data;
};

// ============================================================
// LOGIN
// ============================================================

const login = async ({ email, password }) => {
  const normalizedEmail =
    String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new Error(
      "Email and password are required."
    );
  }

  console.log(
    "================================================"
  );

  console.log(
    ">>> [Auth] Starting login:",
    normalizedEmail
  );

  // ----------------------------------------------------------
  // STEP 1
  // ----------------------------------------------------------
  // Completely clear the browser's previous Supabase session
  // BEFORE authenticating the new account.
  //
  // This is the important account-switching fix.
  // ----------------------------------------------------------

  await clearSupabaseLocalSession();

  // Also clear our own UI state.
  clearAppUserState();

  // ----------------------------------------------------------
  // STEP 2
  // ----------------------------------------------------------
  // Authenticate against your backend.
  //
  // Backend calls:
  // supabase.auth.signInWithPassword(...)
  // ----------------------------------------------------------

  let res;

  try {
    res = await fetch(
      `${API_URL}/auth/login`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      }
    );
  } catch (networkError) {
    console.error(
      "[Auth] Login network error:",
      networkError
    );

    throw new Error(
      "Unable to connect to the server."
    );
  }

  let data;

  try {
    data = await res.json();
  } catch {
    throw new Error(
      "Invalid response from login server."
    );
  }

  console.log(
    ">>> [Auth] Login response:",
    res.status,
    data
  );

  if (!res.ok) {
    throw new Error(
      data.message || "Login failed"
    );
  }

  if (!data.success || !data.data) {
    throw new Error(
      data.message || "Invalid login response."
    );
  }

  const user = data.data;

  // ----------------------------------------------------------
  // STEP 3
  // ----------------------------------------------------------
  // Extract the session returned by the backend.
  // ----------------------------------------------------------

  const accessToken =
    user.token ||
    user.access_token;

  const refreshToken =
    user.refreshToken ||
    user.refresh_token;

  if (!accessToken || !refreshToken) {
    console.error(
      "[Auth] Backend did not return a complete Supabase session.",
      {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        user,
      }
    );

    throw new Error(
      "Login succeeded but no valid authentication session was returned."
    );
  }

  // ----------------------------------------------------------
  // STEP 4
  // ----------------------------------------------------------
  // Establish THIS account's session in the browser.
  // ----------------------------------------------------------

  console.log(
    ">>> [Auth] Setting Supabase frontend session..."
  );

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    console.error(
      "[Auth] Failed to set Supabase session:",
      sessionError.message
    );

    // Don't leave partial login state behind.
    await clearSupabaseLocalSession();
    clearAppUserState();

    throw new Error(
      "Unable to establish your login session."
    );
  }

  // ----------------------------------------------------------
  // STEP 5
  // ----------------------------------------------------------
  // Verify that Supabase actually established the SAME account
  // that the backend authenticated.
  //
  // This prevents an old session from silently surviving.
  // ----------------------------------------------------------

  const frontendSession =
    sessionData?.session;

  const frontendUser =
    frontendSession?.user;

  const backendUid =
    user.uid ||
    user.id;

  console.log(
    ">>> [Auth] Backend UID:",
    backendUid
  );

  console.log(
    ">>> [Auth] Frontend Supabase UID:",
    frontendUser?.id
  );

  if (
    !frontendUser?.id ||
    frontendUser.id !== backendUid
  ) {
    console.error(
      "[Auth] SESSION UID MISMATCH",
      {
        backendUid,
        frontendUid: frontendUser?.id,
      }
    );

    await clearSupabaseLocalSession();
    clearAppUserState();

    throw new Error(
      "Authentication session mismatch. Please try logging in again."
    );
  }

  // ----------------------------------------------------------
  // STEP 6
  // ----------------------------------------------------------
  // Verify the authenticated email too.
  // ----------------------------------------------------------

  const frontendEmail =
    frontendUser.email?.toLowerCase();

  if (
    frontendEmail &&
    frontendEmail !== normalizedEmail
  ) {
    console.error(
      "[Auth] SESSION EMAIL MISMATCH",
      {
        requestedEmail: normalizedEmail,
        frontendEmail,
      }
    );

    await clearSupabaseLocalSession();
    clearAppUserState();

    throw new Error(
      "Authentication session mismatch. Please try again."
    );
  }

  // ----------------------------------------------------------
  // STEP 7
  // ----------------------------------------------------------
  // Save UI-only user information.
  //
  // Tokens are NOT manually stored in localStorage.
  // Supabase manages them.
  // ----------------------------------------------------------

  const savedUser = saveCurrentUser(user);

  console.log(
    ">>> [Auth] Login successful."
  );

  console.log(
    ">>> [Auth] Active UID:",
    savedUser?.uid
  );

  console.log(
    ">>> [Auth] Active email:",
    savedUser?.email
  );

  console.log(
    "================================================"
  );

  return data;
};

// ============================================================
// GET PROFILE
// ============================================================

const getProfile = async () => {
  const headers = await getAuthHeaders();

  if (!headers.Authorization) {
    throw new Error(
      "No active authentication session."
    );
  }

  const res = await fetch(
    `${API_URL}/users/profile`,
    {
      method: "GET",
      headers,
    }
  );

  let data;

  try {
    data = await res.json();
  } catch {
    throw new Error(
      "Invalid response while fetching profile."
    );
  }

  if (!res.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch profile"
    );
  }

  // Keep local UI state synchronized with the database.
  if (data.data) {
    saveCurrentUser(data.data);
  }

  return data.data;
};

// ============================================================
// GET CURRENT USER
// ============================================================

const getCurrentUser = () => {
  try {
    const userStr =
      localStorage.getItem("user");

    if (!userStr) {
      return null;
    }

    return JSON.parse(userStr);
  } catch (error) {
    console.error(
      "[Auth] Invalid local user data:",
      error
    );

    localStorage.removeItem("user");

    return null;
  }
};

// ============================================================
// GET ACTIVE SUPABASE USER
// ============================================================
//
// Useful when you need to know which Auth account is REALLY
// active rather than relying on localStorage.
//

const getSupabaseUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error(
        "[Auth] Failed to get Supabase user:",
        error.message
      );

      return null;
    }

    return user || null;
  } catch (error) {
    console.error(
      "[Auth] Unexpected getUser error:",
      error
    );

    return null;
  }
};

// ============================================================
// LOGOUT
// ============================================================

const logout = async () => {
  console.log(
    ">>> [Auth] Starting logout..."
  );

  // ----------------------------------------------------------
  // STEP 1
  // ----------------------------------------------------------
  // Stop custom token refresh logic first.
  // ----------------------------------------------------------

  try {
    const {
      stopTokenRefresh,
    } = await import(
      "./token.service.js"
    );

    if (
      typeof stopTokenRefresh ===
      "function"
    ) {
      stopTokenRefresh();
    }
  } catch (error) {
    console.warn(
      "[Auth] Could not stop token refresh:",
      error
    );
  }

  // ----------------------------------------------------------
  // STEP 2
  // ----------------------------------------------------------
  // Clear application-level user state.
  // ----------------------------------------------------------

  clearAppUserState();

  // ----------------------------------------------------------
  // STEP 3
  // ----------------------------------------------------------
  // Clear Supabase's LOCAL session.
  //
  // We intentionally use scope: "local" here.
  //
  // This prevents Account A's old browser session from
  // interfering with Account B.
  // ----------------------------------------------------------

  try {
    const { error } =
      await supabase.auth.signOut({
        scope: "local",
      });

    if (error) {
      console.error(
        "[Auth] Error clearing Supabase session:",
        error.message
      );
    }
  } catch (error) {
    console.error(
      "[Auth] Unexpected Supabase logout error:",
      error
    );
  }

  console.log(
    ">>> [Auth] Logout complete."
  );
};

// ============================================================
// CHECK UNIVERSITY ID
// ============================================================

const checkIdExists = async (
  universityId
) => {
  try {
    const response = await fetch(
      `${API_URL}/user/check-id?universityId=${encodeURIComponent(
        universityId
      )}`
    );

    if (!response.ok) {
      throw new Error(
        "Network response was not ok"
      );
    }

    const data =
      await response.json();

    return data.exists;
  } catch (error) {
    console.error(
      "[Auth] Error checking ID:",
      error
    );

    throw new Error(
      "Failed to verify University ID with the server."
    );
  }
};

// ============================================================
// FORGOT PASSWORD
// ============================================================

const forgotPassword = async (
  email
) => {
  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const res = await fetch(
    `${API_URL}/auth/forgot-password`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        email: normalizedEmail,
      }),
    }
  );

  let data;

  try {
    data = await res.json();
  } catch {
    throw new Error(
      "Invalid response from password reset server."
    );
  }

  if (!res.ok) {
    throw new Error(
      data.message ||
        "Failed to send reset email"
    );
  }

  return data;
};

// ============================================================
// EXPORT
// ============================================================

export default {
  register,
  login,
  getProfile,
  getCurrentUser,
  getSupabaseUser,
  logout,
  checkIdExists,
  getAuthHeaders,
  forgotPassword,
};