const userService = require('../features/user/user.service');
const supabase = require('../configs/supabase');
const { sendEmail } = require('../configs/email');
const crypto = require('crypto');

// --- EMAIL VALIDATION HELPER ---
const validateEmailWithEasyEmail = async (email) => {
  const API_KEY = process.env.EASY_EMAIL_API; // Use import.meta.env.VITE_EASY_EMAIL_API on frontend

  if (!API_KEY) {
    console.warn("⚠️ API key not found, skipping email validation.");
    return { isDeliverable: true };
  }

  const API_URL = `https://easyemailapi.com/api/verify/${encodeURIComponent(email)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    console.log(">>> [Email Validation] API Response:", data);

    // 1. Basic formatting check
    if (data.valid === false) {
       return { isDeliverable: false, message: "Invalid email address format." };
    }

    // 2. MX Record check (does the domain actually host email?)
    if (data.valid_mx === false) {
       return { isDeliverable: false, message: "This email domain does not exist or cannot receive emails." };
    }

    // 3. Disposable email check
    if (data.disposable === true) {
       return { isDeliverable: false, message: "Please use a permanent email address, not a temporary one." };
    }

    // 4. Exact Inbox check (ONLY if the API actually performed it)
    if (data.inbox_check_enabled === true && data.inbox_exists === false) {
       return { isDeliverable: false, message: "This exact email inbox does not exist." };
    }

    return { isDeliverable: true };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(">>> [Email Validation] Fetch failed:", error.message);
    // Fail-open: allow the user through so your app doesn't break if the API goes down
    return { isDeliverable: true };
  }
};
// -------------------------------

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if user exists in our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, email, first_name, last_name')
      .eq('email', email.toLowerCase())
      .single();

    // Even if user not found, don't reveal that
    // Just say email sent (prevents email enumeration)
    const userExists = !userError && userData;

    if (userExists) {
      console.log('>>> [Forgot] User found, generating token for:', email);

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

      // Store token in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          reset_password_token: resetToken,
          reset_password_expires_at: expiresAt
        })
        .eq('uid', userData.uid);

      if (updateError) {
        console.error('Failed to store reset token in DB:', updateError);
        throw new Error('Failed to generate reset token');
      }

      console.log('>>> [Forgot] Token stored in DB.');

      // Build reset URL
      const baseUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(userData.email.toLowerCase())}`;

      console.log('>>> [Forgot] Reset URL:', resetUrl);

      // Send custom email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">MediTrack Password Reset</h2>
          <p>Hi ${userData.first_name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link: <br><span style="color: #4F46E5;">${resetUrl}</span></p>
          <p style="color: #666; font-size: 14px;">This link expires in 5 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">MediTrack - University Health Management System</p>
        </div>
      `;

      const emailResult = await sendEmail({
        to: email,
        subject: 'MediTrack - Password Reset Request',
        html: emailHtml,
      });

      console.log('>>> [Forgot] Email send result:', emailResult);
    }

    // Always return success (don't reveal if email exists or not)
    res.json({ success: true, message: 'If an account exists with this email, you will receive a password reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Custom reset password using token
exports.resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;

    console.log('>>> [Reset] Token:', token);
    console.log('>>> [Reset] Email:', email);

    if (!token || !email || !password) {
      return res.status(400).json({ success: false, message: 'Token, email, and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const submittedEmail = email.toLowerCase().trim();

    // Verify token from Database
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('uid, reset_password_expires_at')
      .eq('email', submittedEmail)
      .eq('reset_password_token', token)
      .single();

    if (fetchError || !user) {
      return res.status(400).json({ success: false, message: 'Invalid reset token or email mismatch' });
    }

    if (new Date(user.reset_password_expires_at) < new Date()) {
      // Optional: Clear expired token
      await supabase.from('users').update({ reset_password_token: null, reset_password_expires_at: null }).eq('uid', user.uid);
      return res.status(400).json({ success: false, message: 'Reset token has expired' });
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.uid, {
      password: password
    });

    if (updateError) {
      console.error('Reset password auth error:', updateError);
      return res.status(400).json({ success: false, message: 'Failed to update password' });
    }

    // Delete the used token in DB
    await supabase.from('users').update({
      reset_password_token: null,
      reset_password_expires_at: null
    }).eq('uid', user.uid);

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    console.error('Reset password error:', error);
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

    // --- EMAIL VALIDATION CHECK ---
    const validationResult = await validateEmailWithEasyEmail(email);
    if (!validationResult.isDeliverable) {
      return res.status(400).json({ success: false, message: validationResult.message });
    }
    // ------------------------------

    console.log(`>>> Processing registration for: ${email}`);

    const userData = await userService.registerUser(
      { firstName, lastName, middleName, suffix, email, password, universityId },
      idFile
    );

    // Generate verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store in Database
    await supabase
      .from('users')
      .update({
        verification_token: verifyToken,
        verification_token_expires_at: expiresAt
      })
      .eq('uid', userData.uid);

    const baseUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email.toLowerCase())}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to MediTrack!</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #466460; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
        </div>
        <p>Or copy and paste this link: <br><span style="color: #466460;">${verifyUrl}</span></p>
        <p style="color: #666; font-size: 14px;">This link expires in 5 minutes.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">MediTrack - University Health Management System</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'MediTrack - Email Verification',
      html: emailHtml,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
      data: userData,
      needsVerification: true
    });

  } catch (error) {
    console.error("Registration Error:", error.message);
    const statusCode = error.statusCode || 500;
    const msg = error.message || "Internal server error.";
    return res.status(statusCode).json({ success: false, message: msg });
  }
};

// --- Email Verification ---

// Send verification email
exports.sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, email, first_name, is_verified')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !userData) {
      // Don't reveal if user exists
      return res.json({ success: true, message: 'If an account exists with this email, you will receive a verification link.' });
    }

    // Check if already verified
    if (userData.is_verified) {
      return res.json({ success: true, message: 'This email is already verified. You can login.' });
    }

    // Generate verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store in Database
    await supabase
      .from('users')
      .update({
        verification_token: verifyToken,
        verification_token_expires_at: expiresAt
      })
      .eq('uid', userData.uid);

    // Build verification URL
    const baseUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(userData.email.toLowerCase())}`;

    // Send verification email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to MediTrack!</h2>
        <p>Hi ${userData.first_name},</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #466460; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
        </div>
        <p>Or copy and paste this link: <br><span style="color: #466460;">${verifyUrl}</span></p>
        <p style="color: #666; font-size: 14px;">This link expires in 5 minutes.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">MediTrack - University Health Management System</p>
      </div>
    `;

    const emailResult = await sendEmail({
      to: email,
      subject: 'MediTrack - Email Verification',
      html: emailHtml,
    });

    console.log('>>> [Verify] Email send result:', emailResult);

    // Always return success (don't reveal if email exists)
    return res.json({ success: true, message: 'If an account exists with this email, you will receive a verification link.' });

  } catch (error) {
    console.error('Send verification email error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Verify email endpoint
exports.verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({ success: false, message: 'Token and email are required' });
    }

    console.log('>>> [Verify] Token:', token);
    console.log('>>> [Verify] Email:', email);

    const submittedEmail = email.toLowerCase().trim();

    // 1. Look up the user by email AND token in Supabase
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('uid, verification_token_expires_at, is_verified')
      .eq('email', submittedEmail)
      .eq('verification_token', token)
      .single();

    // If no user is found with that email + token combination
    if (fetchError || !user) {
      return res.status(400).json({ success: false, message: 'Invalid verification token' });
    }

    // 2. Check if the token has expired
    if (new Date(user.verification_token_expires_at) < new Date()) {
      // Clear the expired token
      await supabase.from('users').update({
        verification_token: null,
        verification_token_expires_at: null
      }).eq('uid', user.uid);
      return res.status(400).json({ success: false, message: 'Verification token has expired' });
    }

    // 3. Mark user as verified and clear the token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_verified: true,
        verification_token: null,
        verification_token_expires_at: null
      })
      .eq('uid', user.uid);

    if (updateError) {
      console.error('Verify email error:', updateError);
      return res.status(400).json({ success: false, message: 'Failed to verify email' });
    }

    res.json({ success: true, message: 'Email verified successfully! You can now login.' });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Admin: Resend verification email for any user
exports.adminResendVerification = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Get user by ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, email, first_name, is_verified')
      .eq('uid', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already verified
    if (userData.is_verified) {
      return res.json({ success: true, message: 'This user is already verified' });
    }

    // --- EMAIL VALIDATION CHECK ---
    const validationResult = await validateEmailWithEasyEmail(userData.email);
    if (!validationResult.isDeliverable) {
      return res.status(400).json({
        success: false,
        message: `The email ${userData.email} appears to be invalid or non-existent.`
      });
    }
    // ------------------------------

    // Generate new verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store in Database
    await supabase
      .from('users')
      .update({
        verification_token: verifyToken,
        verification_token_expires_at: expiresAt
      })
      .eq('uid', userData.uid);

    const baseUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(userData.email.toLowerCase())}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Verify Your MediTrack Email</h2>
        <p>Hi ${userData.first_name},</p>
        <p>An administrator has requested to verify your email. Please click the button below to verify:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #466460; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
        </div>
        <p>Or copy and paste this link: <br><span style="color: #466460;">${verifyUrl}</span></p>
        <p style="color: #666; font-size: 14px;">This link expires in 5 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">MediTrack - University Health Management System</p>
      </div>
    `;

    const emailResult = await sendEmail({
      to: userData.email,
      subject: 'MediTrack - Email Verification Request',
      html: emailHtml,
    });

    console.log('>>> [Admin Resend] Email send result:', emailResult);

    return res.json({ success: true, message: 'Verification email sent successfully' });

  } catch (error) {
    console.error('Admin resend verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    // Check if email is verified
    const { data: userCheck } = await supabase
      .from('users')
      .select('is_verified')
      .eq('email', email.toLowerCase())
      .single();

    if (userCheck && !userCheck.is_verified) {
      return res.status(403).json({
        success: false,
        message: "Email not verified. Please verify your email first.",
        needsVerification: true
      });
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