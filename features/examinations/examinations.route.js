// C:\Users\HP\MediTrack\features\examinations\examinations.route.js

const express = require("express");
const router = express.Router();

const examinationsController = require("./examinations.controller");

const { authorized } = require("../../middleware/authorized");
const { requireRole } = require("../../middleware/roleBasedAccess");

const validateData = require("../../validation/validate-data");

const {
  createExaminationSchema,
  updateExaminationSchema,
} = require("./examinations.validation");

const { auditLog } = require("../../middleware/auditLogger");


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
// ADMIN + STAFF
router.post(
  "/",
  authorized,
  requireRole("sysadmin", "staff"),

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
// ADMIN + STAFF
router.put(
  "/:id",
  authorized,
  requireRole("sysadmin", "staff"),

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
// ADMIN ONLY
router.delete(
  "/:id",
  authorized,
  requireRole("sysadmin"),

  auditLog(
    "delete",
    "examination",
    (req) =>
      `Archived examination ID: ${req.params.id}`
  ),

  examinationsController.deleteExamination
);


module.exports = router;