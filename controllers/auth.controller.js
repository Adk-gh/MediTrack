// C:\Users\HP\MediTrack\controllers\auth.controller.js
const userService = require('../features/user/user.service');
const supabase = require('../configs/database');
const { sendEmail } = require('../services/email.service');
const crypto = require('crypto');

// --- EMAIL VALIDATION HELPER ---
const validateEmailWithEasyEmail = async (email) => {
  const API_KEY = process.env.EASY_EMAIL_API;

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

    if (data.valid === false) return { isDeliverable: false, message: "Invalid email address format." };
    if (data.valid_mx === false) return { isDeliverable: false, message: "This email domain does not exist or cannot receive emails." };
    if (data.disposable === true) return { isDeliverable: false, message: "Please use a permanent email address, not a temporary one." };
    if (data.inbox_check_enabled === true && data.inbox_exists === false) return { isDeliverable: false, message: "This exact email inbox does not exist." };

    return { isDeliverable: true };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(">>> [Email Validation] Fetch failed:", error.message);
    return { isDeliverable: true };
  }
};
// -------------------------------

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, email, first_name, last_name')
      .eq('email', email.toLowerCase())
      .single();

    const userExists = !userError && userData;

    if (userExists) {
      console.log('>>> [Forgot] User found, generating token for:', email);

      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from('users')
        .update({
          reset_password_token: resetToken,
          reset_password_expires_at: expiresAt
        })
        .eq('uid', userData.uid);

      if (updateError) throw new Error('Failed to generate reset token');

      const baseUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
      const resetUrl = `${baseUrl}/#/reset-password?token=${resetToken}&email=${encodeURIComponent(userData.email.toLowerCase())}`;

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
        </div>
      `;

      await sendEmail({
        to: email,
        subject: 'MediTrack - Password Reset Request',
        html: emailHtml,
      });
    }

    res.json({ success: true, message: 'If an account exists with this email, you will receive a password reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) return res.status(400).json({ success: false, message: 'Token, email, and new password are required' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const submittedEmail = email.toLowerCase().trim();

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('uid, reset_password_expires_at')
      .ilike('email', submittedEmail)
      .eq('reset_password_token', token)
      .single();

    if (fetchError || !user) return res.status(400).json({ success: false, message: 'Invalid reset token or email mismatch' });

    if (new Date(user.reset_password_expires_at) < new Date()) {
      await supabase.from('users').update({ reset_password_token: null, reset_password_expires_at: null }).eq('uid', user.uid);
      return res.status(400).json({ success: false, message: 'Reset token has expired' });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.uid, { password: password });

    if (updateError) return res.status(400).json({ success: false, message: 'Failed to update password' });

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

    if (!idFile) return res.status(400).json({ success: false, message: "Please upload your University ID image." });
    if (!firstName || !lastName || !email || !password || !universityId) return res.status(400).json({ success: false, message: "Missing required fields." });

    const validationResult = await validateEmailWithEasyEmail(email);
    if (!validationResult.isDeliverable) return res.status(400).json({ success: false, message: validationResult.message });

    const userData = await userService.registerUser({ firstName, lastName, middleName, suffix, email, password, universityId }, idFile);

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabase.from('users').update({
      verification_token: verifyToken,
      verification_token_expires_at: expiresAt
    }).eq('uid', userData.uid);

    const baseUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/#/verify-email?token=${verifyToken}&email=${encodeURIComponent(email.toLowerCase())}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to MediTrack!</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #466460; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
        </div>
      </div>
    `;

    await sendEmail({ to: email, subject: 'MediTrack - Email Verification', html: emailHtml });

    return res.status(201).json({
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
      data: userData,
      needsVerification: true
    });

  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || "Internal server error." });
  }
};

exports.sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, email, first_name, is_verified')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !userData) return res.json({ success: true, message: 'If an account exists with this email, you will receive a verification link.' });
    if (userData.is_verified) return res.json({ success: true, message: 'This email is already verified. You can login.' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabase.from('users').update({
      verification_token: verifyToken,
      verification_token_expires_at: expiresAt
    }).eq('uid', userData.uid);

    const baseUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/#/verify-email?token=${verifyToken}&email=${encodeURIComponent(userData.email.toLowerCase())}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to MediTrack!</h2>
        <p>Hi ${userData.first_name},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #466460; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
        </div>
      </div>
    `;

    await sendEmail({ to: email, subject: 'MediTrack - Email Verification', html: emailHtml });
    return res.json({ success: true, message: 'If an account exists with this email, you will receive a verification link.' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.body;
    if (!token || !email) return res.status(400).json({ success: false, message: 'Token and email are required' });

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('uid, verification_token_expires_at, is_verified')
      .ilike('email', email.trim())
      .eq('verification_token', token)
      .single();

    if (fetchError || !user) return res.status(400).json({ success: false, message: 'Invalid verification token' });

    if (new Date(user.verification_token_expires_at) < new Date()) {
      await supabase.from('users').update({ verification_token: null, verification_token_expires_at: null }).eq('uid', user.uid);
      return res.status(400).json({ success: false, message: 'Verification token has expired' });
    }

    const { error: authConfirmError } = await supabase.auth.admin.updateUserById(user.uid, { email_confirm: true });
    if (authConfirmError) return res.status(500).json({ success: false, message: 'Failed to confirm email in auth' });

    const { error: updateError } = await supabase.from('users').update({
      is_verified: true,
      verification_token: null,
      verification_token_expires_at: null
    }).eq('uid', user.uid);

    if (updateError) return res.status(400).json({ success: false, message: 'Failed to verify email' });
    res.json({ success: true, message: 'Email verified successfully! You can now login.' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.adminResendVerification = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, email, first_name, is_verified')
      .eq('uid', userId)
      .single();

    if (userError || !userData) return res.status(404).json({ success: false, message: 'User not found' });
    if (userData.is_verified) return res.json({ success: true, message: 'This user is already verified' });

    const validationResult = await validateEmailWithEasyEmail(userData.email);
    if (!validationResult.isDeliverable) return res.status(400).json({ success: false, message: "Invalid email." });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabase.from('users').update({
      verification_token: verifyToken,
      verification_token_expires_at: expiresAt
    }).eq('uid', userData.uid);

    const baseUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/#/verify-email?token=${verifyToken}&email=${encodeURIComponent(userData.email.toLowerCase())}`;

    await sendEmail({
      to: userData.email,
      subject: 'MediTrack - Email Verification Request',
      html: `<a href="${verifyUrl}">Verify Email</a>`,
    });

    return res.json({ success: true, message: 'Verification email sent successfully' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required." });

    const { data: userCheck } = await supabase.from('users').select('is_verified').eq('email', email.toLowerCase()).single();

    if (userCheck && !userCheck.is_verified) {
      return res.status(403).json({ success: false, message: "Email not verified. Please verify your email first.", needsVerification: true });
    }

    const userData = await userService.loginUser({ email, password });

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        token: userData.token,
        refreshToken: userData.refreshToken,
        uid: userData.uid || userData.id,
        firstName: userData.firstName || userData.first_name,
        lastName: userData.lastName || userData.last_name,
        email: userData.email,
        role: userData.role,
      }
    });
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return res.status(statusCode).json({ success: false, message: error.message || "Login failed." });
  }
};

exports.getEmailStatus = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'Email query parameter is required' });

    const { data, error } = await supabase.from('email_logs').select('status').eq('email', email).maybeSingle();
    if (error || !data) return res.status(200).json({ status: 'pending' });
    return res.status(200).json({ status: data.status });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};