// C:\Users\HP\MediTrack\controllers\auth.controller.js
const userService = require('../features/user/user.service');
const supabase = require('../configs/supabase');

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password`
    });

    if (error) {
      console.error('Forgot password error:', error);
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({ success: true, message: 'Password reset email sent. Check your inbox.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, middleName, suffix, email, password, universityId } = req.body;
    const idFile = req.file;

    if (!idFile) {
      return res.status(400).json({ success: false, message: "Please upload your University ID image." });
    }
    if (!firstName || !lastName || !email || !password || !universityId) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    console.log(`>>> Processing registration for: ${email}`);

    const userData = await userService.registerUser(
      { firstName, lastName, middleName, suffix, email, password, universityId },
      idFile
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful! ID Verified.",
      data: userData
    });

  } catch (error) {
    console.error("Registration Error:", error.message);
    const statusCode = error.statusCode || 500;
    const msg = error.message || "Internal server error.";
    return res.status(statusCode).json({ success: false, message: msg });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    // Ensure your userService.loginUser is returning the full database row!
    const userData = await userService.loginUser({ email, password });

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        token:          userData.token,
        refreshToken:   userData.refreshToken,   // ✅ pass refresh token to frontend
        uid:            userData.uid || userData.id,
        firstName:      userData.firstName || userData.first_name,
        lastName:       userData.lastName || userData.last_name,
        middleName:     userData.middleName || userData.middle_name,
        email:          userData.email,
        role:           userData.role,
        isProfileSetup: userData.isProfileSetup || userData.is_profile_setup || false,

        // ✅ ADDED: Pass the missing demographic fields to the frontend!
        university_id:  userData.university_id || userData.universityId,
        department:     userData.department || userData.dept,
        program:        userData.program || userData.classification,
        section:        userData.section || userData.year_level,
      }
    });

  } catch (error) {
    console.error("Login Error:", error.message);
    const statusCode = error.statusCode || 401;
    return res.status(statusCode).json({ success: false, message: error.message || "Login failed." });
  }
};