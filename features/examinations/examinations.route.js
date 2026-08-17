// C:\Users\HP\MediTrack\features\examinations\examinations.route.js

const express = require("express");
const router = express.Router();

const examinationsController = require("./examinations.controller");

const { authorized } = require("../../middleware/authorized");

const validateData = require("../../validation/validate-data");

const {
  createExaminationSchema,
  updateExaminationSchema,
} = require("./examinations.validation");

const { auditLog } = require("../../middleware/auditLogger");
const { getSystemConfig } = require("../../services/systemConfig.service");


// =========================================================
// DYNAMIC ROLE MIDDLEWARES
// =========================================================

// Allows Admin Roles + Clinic Staffs (for creating/updating examinations)
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

// Allows Admin Roles ONLY (for deleting/archiving examinations)
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
// VIEW EXAMINATIONS
// =========================================================

// Get all examinations
// Any authenticated user
router.get(
  "/",
  authorized,
  examinationsController.getAllExaminations
);


// =========================================================
// SPECIFIC EXAMINATION TYPES
// =========================================================

// Get medical examinations
// Any authenticated user
router.get(
  "/medical",
  authorized,
  examinationsController.getMedicalExaminations
);


// Get dental examinations
// Any authenticated user
router.get(
  "/dental",
  authorized,
  examinationsController.getDentalExaminations
);


// =========================================================
// GET SINGLE EXAMINATION
// =========================================================

// Get examination by ID
// Any authenticated user
router.get(
  "/:id",
  authorized,
  examinationsController.getExaminationById
);


// =========================================================
// CREATE EXAMINATION
// =========================================================

// Create a new examination
// ADMIN + CLINIC STAFFS (Dynamic)
router.post(
  "/",
  authorized,
  allowDynamicClinicStaffs,

  auditLog(
    "create",
    "examination",
    (req) =>
      `Created new ${
        req.body.examination_type || "medical"
      } examination`
  ),

  validateData(createExaminationSchema),

  examinationsController.createExamination
);


// =========================================================
// UPDATE EXAMINATION
// =========================================================

// Update an examination
// ADMIN + CLINIC STAFFS (Dynamic)
router.put(
  "/:id",
  authorized,
  allowDynamicClinicStaffs,

  auditLog(
    "update",
    "examination",
    (req) =>
      `Updated examination ID: ${req.params.id}`
  ),

  validateData(updateExaminationSchema),

  examinationsController.updateExamination
);


// =========================================================
// DELETE / ARCHIVE EXAMINATION
// =========================================================

// Archive/delete an examination
// ADMIN ONLY (Dynamic)
router.delete(
  "/:id",
  authorized,
  allowDynamicAdmin,

  auditLog(
    "delete",
    "examination",
    (req) =>
      `Archived examination ID: ${req.params.id}`
  ),

  examinationsController.deleteExamination
);


module.exports = router;