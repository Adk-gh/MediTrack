// C:\Users\HP\MediTrack\features\user\user.controller.js
const userService = require("./user.service");

/**
 * REGISTER: Handled via userService
 */
const register = async (req, res, next) => {
  try {
    console.log(">>> Registering User:", req.body.email);
    const result = await userService.registerUser(req.body, req.file);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * LOGIN: Handled via userService
 */
const login = async (req, res, next) => {
  try {
    const result = await userService.loginUser(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * FIREBASE AUTH: Fallback for third-party firebase tokens
 */
const firebaseAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body || {};
    const result = await userService.firebaseLogin(idToken);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET PROFILE: Fetches full Firestore data using UID from JWT
 */
const getProfile = async (req, res, next) => {
  try {
    // SECURITY CHECK: Ensure the middleware successfully decoded the UID
    const uid = req.user?.uid;

    if (!uid) {
      console.error(">>> Error: req.user.uid is undefined in getProfile");
      return res.status(400).json({ 
        success: false, 
        message: "Identification error: User UID not found in token." 
      });
    }

    const user = await userService.getProfile(uid);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * SETUP PROFILE: Updates user details and marks profileComplete = true
 */
const setupProfile = async (req, res, next) => {
  try {
    // SECURITY CHECK: This prevents the "documentPath" error
    const uid = req.user?.uid;

    console.log(">>> Attempting profile setup for UID:", uid);

    if (!uid) {
      console.error(">>> Error: req.user.uid is undefined in setupProfile");
      return res.status(400).json({ 
        success: false, 
        message: "Identification error: User UID not found in token." 
      });
    }

    // Pass the UID and the form data to the service
    const result = await userService.setupProfile(uid, req.body);
    
    res.status(200).json({ 
      success: true, 
      message: "Profile updated successfully",
      data: result 
    });
  } catch (error) {
    console.error(">>> Controller Setup Error:", error.message);
    
    // Catch the Firestore path error specifically to give a clean message
    if (error.message.includes("documentPath")) {
      return res.status(500).json({
        success: false,
        message: "Database Error: Invalid User Path. Please log in again."
      });
    }
    
    next(error);
  }
};

module.exports = { register, login, firebaseAuth, getProfile, setupProfile };