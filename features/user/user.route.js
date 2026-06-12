const express = require("express");
const router = express.Router();
const multer = require("multer");
const userController = require("./user.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");
const supabase = require('../../configs/database');

// 1. Import the audit logger
const { auditLog } = require('../../middleware/auditLogger');

const {
  registerSchema,
  loginSchema,
  firebaseAuthSchema,
} = require("./user.validation");

const upload = multer({ storage: multer.memoryStorage() });

// GET requests - No logging to prevent database spam
router.get("/check-id", userController.checkIdExists);

// POST: Log successful registrations
router.post(
  "/register",
  upload.single("image"),
  validateData(registerSchema),
  auditLog('register', 'user', (req) => `Registered new user account: ${req.body.email || 'Unknown'}`),
  userController.register
);

// POST: Log successful logins
router.post(
  "/login",
  /*validateData(loginSchema),*/
  auditLog('login', 'auth', (req) => `User logged in: ${req.body.email || 'Unknown'}`),
  userController.login
);

// GET requests - No logging
router.get("/profile", authorized, userController.getProfile);
router.get("/profile-setup", authorized, userController.checkProfileSetup);

// POST: Log initial profile setups
router.post(
  "/profile-setup",
  authorized,
  auditLog('create', 'user', 'User completed initial profile setup'),
  userController.setupProfile
);

// PUT: Log profile updates
router.put(
  "/profile",
  authorized,
  auditLog('update', 'user', 'User updated their profile details'),
  userController.updateProfile
);

const getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    const users = data.map(doc => ({ id: doc.uid, ...doc }));
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET request - No logging
router.get("/users", authorized, getAllUsers);

// DELETE user - move to archives
router.delete("/users/:userId", authorized, userController.deleteUser);

module.exports = router;