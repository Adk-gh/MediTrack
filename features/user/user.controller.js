// C:\Users\HP\MediTrack\features\user\user.controller.js
const userService = require("./user.service");

const register = async (req, res, next) => {
  try {
    console.log(">>> Registering User:", req.body.email);
    const result = await userService.registerUser(req.body, req.file);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await userService.loginUser(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(400).json({ success: false, message: "User UID not found in token." });
    }
    const user = await userService.getProfile(uid);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const setupProfile = async (req, res, next) => {
  try {
    const uid = req.user?.uid;
    console.log(">>> Attempting profile setup for UID:", uid);
    if (!uid) {
      return res.status(400).json({ success: false, message: "User UID not found in token." });
    }
    const result = await userService.setupProfile(uid, req.body);
    res.status(200).json({ success: true, message: "Profile updated successfully", data: result });
  } catch (error) {
    next(error);
  }
};

const checkProfileSetup = async (req, res, next) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(400).json({ success: false, message: "User UID not found in token." });
    }
    const user = await userService.getProfile(uid);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, isProfileSetup: user.isProfileSetup || false, data: user });
  } catch (error) {
    next(error);
  }
};

const checkIdExists = async (req, res, next) => {
  try {
    const { universityId } = req.query;
    if (!universityId) {
      return res.status(400).json({ success: false, message: "University ID is required" });
    }
    const exists = await userService.checkUniversityId(universityId);
    return res.status(200).json({ exists });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(400).json({ success: false, message: "User UID not found in token." });
    }
    const updates = req.body;
    // Remove system fields that shouldn't be updated directly
    delete updates.uid;
    delete updates.email;
    delete updates.role;
    delete updates.createdAt;

    const updated = await userService.updateProfile(uid, updates);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getProfile, setupProfile, checkProfileSetup, checkIdExists, updateProfile };