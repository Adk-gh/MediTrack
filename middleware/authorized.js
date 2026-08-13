const supabase = require('../configs/database');

/**
 * Authentication Middleware
 *
 * Verifies the Supabase access token and loads the user's
 * profile and role from the `users` table.
 *
 * IMPORTANT:
 * This middleware only authenticates the user.
 * Role authorization is handled separately by:
 *
 *   middleware/roleBasedAccess.js
 *
 * Example:
 *
 * router.get(
 *   '/admin/users',
 *   authorized,
 *   requireAdmin,
 *   controller.getUsers
 * );
 */
const authorized = async (req, res, next) => {
  try {
    // ---------------------------------------------------------
    // 1. Get Authorization Header
    // ---------------------------------------------------------
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    // Remove "Bearer "
    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Invalid token.'
      });
    }

    // ---------------------------------------------------------
    // 2. Verify Supabase JWT
    // ---------------------------------------------------------
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error(
        '>>> [Auth] Supabase JWT Verification Failed:',
        authError?.message || 'No user found'
      );

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }

    // ---------------------------------------------------------
    // 3. Fetch User Profile
    // ---------------------------------------------------------
    const {
      data: userProfile,
      error: profileError
    } = await supabase
      .from('users')
      .select(`
        uid,
        first_name,
        middle_name,
        last_name,
        email,
        role,
        is_verified,
        is_archived
      `)
      .eq('uid', user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        '>>> [Auth] Failed to fetch user profile:',
        profileError.message
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to verify user profile.'
      });
    }

    // ---------------------------------------------------------
    // 4. Make Sure User Exists in Application Database
    // ---------------------------------------------------------
    if (!userProfile) {
      console.warn(
        `>>> [Auth] Authenticated user has no profile: ${user.id}`
      );

      return res.status(403).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    // ---------------------------------------------------------
    // 5. Check Archived Account
    // ---------------------------------------------------------
    if (userProfile.is_archived === true) {
      console.warn(
        `>>> [Auth] Archived account attempted access: ${user.id}`
      );

      return res.status(403).json({
        success: false,
        message: 'This account has been archived.'
      });
    }

    // ---------------------------------------------------------
    // 6. Get Role
    // ---------------------------------------------------------
    //
    // The database role is the primary source of truth.
    //
    // Do NOT allow a normal client-side value to override
    // the role stored in the users table.
    //
    const role = String(
      userProfile.role || 'student'
    )
      .trim()
      .toLowerCase();

    // ---------------------------------------------------------
    // 7. Get User Metadata as Optional Fallback for Names
    // ---------------------------------------------------------
    const metadata = user.user_metadata || {};

    // ---------------------------------------------------------
    // 8. Attach Authenticated User to Request
    // ---------------------------------------------------------
    req.user = {
      uid: user.id,

      email:
        userProfile.email ||
        user.email ||
        '',

      role,

      first_name:
        userProfile.first_name ||
        metadata.firstName ||
        '',

      middle_name:
        userProfile.middle_name ||
        metadata.middleName ||
        '',

      last_name:
        userProfile.last_name ||
        metadata.lastName ||
        '',

      is_verified:
        userProfile.is_verified === true,

      // Useful if you need it later
      supabase_user: user
    };

    // ---------------------------------------------------------
    // 9. Continue to Route
    // ---------------------------------------------------------
    next();

  } catch (error) {
    console.error(
      '>>> [Auth] Authentication Middleware Error:',
      error.message
    );

    return res.status(401).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

module.exports = {
  authorized
};