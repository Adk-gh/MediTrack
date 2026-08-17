// C:\Users\HP\MediTrack\features\Records\records.route.js

const express = require("express");
const router = express.Router();

const recordsController = require("./records.controller");

const { authorized } = require("../../middleware/authorized");

const validateData = require("../../validation/validate-data");

const {
  createRecordSchema,
  updateRecordSchema,
} = require("./records.validation");

const { getSystemConfig } = require("../../services/systemConfig.service");


// ============================================================
// DYNAMIC ROLE MIDDLEWARES
// ============================================================

// Allows Admin Roles + Clinic Staffs
// Used for creating/updating records and certificate requests.
const allowDynamicClinicStaffs = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();

    if (!userRole) {
      return res.status(403).json({
        message: "Access denied. No role found."
      });
    }

    const config = await getSystemConfig();

    const clinicRoles = Array.isArray(config?.clinic_roles)
      ? config.clinic_roles.map(r => String(r).toLowerCase())
      : [];

    const adminRoles = Array.isArray(config?.admin_roles)
      ? config.admin_roles.map(r => String(r).toLowerCase())
      : [];

    // Safety net
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
      message:
        "Access denied. Clinic staff or Admin privileges required."
    });

  } catch (error) {
    console.error(
      "[DynamicRoleCheck] Clinic staffs verification failed:",
      error
    );

    return res.status(500).json({
      message:
        "Internal server error during role validation."
    });
  }
};


// ============================================================
// ADMIN ONLY
// ============================================================

// Allows Admin Roles ONLY
// Used for deleting/archiving records.
const allowDynamicAdmin = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();

    if (!userRole) {
      return res.status(403).json({
        message: "Access denied. No role found."
      });
    }

    const config = await getSystemConfig();

    const adminRoles = Array.isArray(config?.admin_roles)
      ? config.admin_roles.map(r => String(r).toLowerCase())
      : [];

    const allowedRoles = [
      ...adminRoles,
      "sysadmin"
    ];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      message:
        "Access denied. Admin privileges required."
    });

  } catch (error) {
    console.error(
      "[DynamicRoleCheck] Admin verification failed:",
      error
    );

    return res.status(500).json({
      message:
        "Internal server error during role validation."
    });
  }
};


// ============================================================
// VIEW RECORDS
// ============================================================

// Get all records
// Any authenticated user
router.get(
  "/",
  authorized,
  recordsController.getAllRecords
);


// ============================================================
// CERTIFICATE REQUEST
// ============================================================

// User requests a medical/dental certificate.
//
// IMPORTANT:
// This endpoint is intentionally NOT protected by
// allowDynamicClinicStaffs because ordinary users/students
// must be able to request their own certificate.
//
// The controller/service verifies the authenticated user
// owns the requested record.
router.post(
  "/:id/certificate-request",
  authorized,
  recordsController.requestCertificate
);


// ============================================================
// GET SPECIFIC RECORD
// ============================================================

// Get a specific record
// Any authenticated user
router.get(
  "/:id",
  authorized,
  recordsController.getRecordById
);


// ============================================================
// CREATE RECORD
// ============================================================

// Create a health record
// ADMIN + CLINIC STAFFS
router.post(
  "/",
  authorized,
  allowDynamicClinicStaffs,
  validateData(createRecordSchema),
  recordsController.createRecord
);


// ============================================================
// UPDATE RECORD
// ============================================================

// Update a health record
// ADMIN + CLINIC STAFFS
router.put(
  "/:id",
  authorized,
  allowDynamicClinicStaffs,
  validateData(updateRecordSchema),
  recordsController.updateRecord
);


// ============================================================
// DELETE RECORD
// ============================================================

// Delete a health record
// ADMIN ONLY
router.delete(
  "/:id",
  authorized,
  allowDynamicAdmin,
  recordsController.deleteRecord
);


// ============================================================
// AUTO-ARCHIVE
// ============================================================

// Automatically archive old records
// ADMIN ONLY
router.post(
  "/auto-archive",
  authorized,
  allowDynamicAdmin,
  recordsController.autoArchiveRecords
);


module.exports = router;