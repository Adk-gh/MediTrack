// C:\Users\HP\MediTrack\features\user\user.route.js

const express = require("express");
const router = express.Router();
const multer = require("multer");

const userController = require("./user.controller");

const { authorized } = require("../../middleware/authorized");

const validateData = require("../../validation/validate-data");
const supabase = require("../../configs/database");

// Audit logger
const { auditLog } = require("../../middleware/auditLogger");

const {
  registerSchema,
  loginSchema,
} = require("./user.validation");

const { getSystemConfig } = require("../../services/systemConfig.service");

const upload = multer({ storage: multer.memoryStorage() });


// =========================================================
// DYNAMIC ROLE MIDDLEWARES
// =========================================================

// Allows Admin Roles + Clinic Staffs (e.g., viewing user lists)
const allowDynamicClinicStaffs = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!userRole) {
      return res.status(403).json({ message: "Access denied. No role found." });
    }

    const config = await getSystemConfig();

    const clinicRoles = (config.clinic_roles || []).map(r => r.toLowerCase());
    const adminRoles = (config.admin_roles || []).map(r => r.toLowerCase());

    // Safety net: Keep core clinical roles and sysadmin as hardcoded fallbacks
    const allowedRoles = [
      ...clinicRoles,
      ...adminRoles,
      "sysadmin",
      "doctor",
      "dentist",
      "nurse"
    ];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      message: "Access denied. Clinic staff or Admin privileges required."
    });
  } catch (error) {
    console.error("[DynamicRoleCheck] Clinic staffs verification failed:", error);
    return res.status(500).json({ message: "Internal server error during role validation." });
  }
};

// Allows Admin Roles ONLY (e.g., deleting/updating user data)
const allowDynamicAdmin = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!userRole) {
      return res.status(403).json({ message: "Access denied. No role found." });
    }

    const config = await getSystemConfig();

    const adminRoles = (config.admin_roles || []).map(r => r.toLowerCase());

    // Keep "sysadmin" as a hardcoded fallback
    const allowedRoles = [...adminRoles, "sysadmin"];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      message: "Access denied. Admin privileges required."
    });
  } catch (error) {
    console.error("[DynamicRoleCheck] Admin verification failed:", error);
    return res.status(500).json({ message: "Internal server error during role validation." });
  }
};


// =========================================================
// PUBLIC ROUTES
// =========================================================

// Check if university ID already exists
router.get(
  "/check-id",
  userController.checkIdExists
);


// =========================================================
// REGISTRATION
// =========================================================

// Register a new user
router.post(
  "/register",
  upload.single("image"),
  validateData(registerSchema),
  auditLog(
    "register",
    "user",
    (req) =>
      `Registered new user account: ${req.body.email || "Unknown"}`
  ),
  userController.register
);


// =========================================================
// LOGIN
// =========================================================

// Login
router.post(
  "/login",

  // validateData(loginSchema),

  async (req, res, next) => {
    let userDetails = "";

    try {
      const { data: existingUser, error: userError } =
        await supabase
          .from("users")
          .select(
            "first_name, middle_name, last_name, university_id"
          )
          .eq("email", req.body.email)
          .single();

      if (existingUser && !userError) {
        userDetails =
          `${existingUser.first_name || ""} ` +
          `${existingUser.middle_name || ""} ` +
          `${existingUser.last_name || ""}`
            .trim()
            .replace(/\s+/g, " ");

        if (existingUser.university_id) {
          userDetails += ` (${existingUser.university_id})`;
        }
      }
    } catch (e) {
      // Do not block login if audit lookup fails
    }

    req.loginUserDetails =
      userDetails || req.body.email;

    next();
  },

  auditLog(
    "login",
    "auth",
    (req) => {
      const details = req.loginUserDetails
        ? ` - ${req.loginUserDetails}`
        : "";

      return `User logged in: ${
        req.body.email || "Unknown"
      }${details}`;
    }
  ),

  userController.login
);


// =========================================================
// USER PROFILE
// =========================================================

// Get own profile
// Any authenticated user
router.get(
  "/profile",
  authorized,
  userController.getProfile
);


// Check own profile setup
// Any authenticated user
router.get(
  "/profile-setup",
  authorized,
  userController.checkProfileSetup
);


// Complete initial profile setup
// Any authenticated user
router.post(
  "/profile-setup",
  authorized,

  auditLog(
    "create",
    "user",
    "User completed initial profile setup"
  ),

  userController.setupProfile
);


// Toggle own profile completion
// Any authenticated user
router.put(
  "/profile-complete",
  authorized,

  auditLog(
    "update",
    "user",
    "User toggled profile complete status"
  ),

  userController.toggleProfileComplete
);


// Update own profile
// Any authenticated user
router.put(
  "/profile",
  authorized,

  auditLog(
    "update",
    "user",
    "User updated their profile details"
  ),

  userController.updateProfile
);


// =========================================================
// USER MANAGEMENT
// =========================================================

const getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    const users = data.map((doc) => ({
      id: doc.uid,
      ...doc,
    }));

    res.status(200).json(users);

  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};


// Get all users
// ADMIN + CLINIC STAFFS (Dynamic)
router.get(
  "/users",
  authorized,
  allowDynamicClinicStaffs,
  getAllUsers
);


// =========================================================
// DELETE / ARCHIVE USER
// =========================================================

// Archive a user
// ADMIN ONLY (Dynamic)
router.delete(
  "/users/:userId",

  authorized,

  allowDynamicAdmin,

  async (req, res, next) => {

    let userDetails = "";

    try {
      const { data: user } = await supabase
        .from("users")
        .select(
          "first_name, middle_name, last_name, university_id"
        )
        .eq("uid", req.params.userId)
        .single();

      if (user) {
        userDetails =
          `${user.first_name || ""} ` +
          `${user.middle_name || ""} ` +
          `${user.last_name || ""}`
            .trim()
            .replace(/\s+/g, " ");

        if (user.university_id) {
          userDetails += ` (${user.university_id})`;
        }
      }

    } catch (e) {
      // Do not block the archive operation
    }

    req.userDetails = userDetails;

    next();
  },

  auditLog(
    "archive",
    "user",
    (req) => {
      const details = req.userDetails
        ? ` - ${req.userDetails}`
        : "";

      return `Archived user ID: ${
        req.params.userId
      }${details}`;
    }
  ),

  userController.deleteUser
);


// =========================================================
// ADMIN USER UPDATE
// =========================================================

// Update any user's information
// ADMIN ONLY (Dynamic)
router.put(
  "/admin-update",

  authorized,

  allowDynamicAdmin,

  auditLog(
    "update",
    "user",
    (req) =>
      `Admin updated user: ${
        req.body.email ||
        req.params.userId ||
        "Unknown"
      }`
  ),

  userController.adminUpdateUser
);


module.exports = router;