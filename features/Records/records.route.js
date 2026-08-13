// C:\Users\HP\MediTrack\features\Records\records.route.js

const express = require("express");
const router = express.Router();

const recordsController = require("./records.controller");

const { authorized } = require("../../middleware/authorized");
const { requireRole } = require("../../middleware/roleBasedAccess");

const validateData = require("../../validation/validate-data");

const {
  createRecordSchema,
  updateRecordSchema,
} = require("./records.validation");


// =========================================================
// VIEW RECORDS
// =========================================================

// Get all records
// Any authenticated user
router.get(
  "/",
  authorized,
  recordsController.getAllRecords
);


// Get a specific record
// Any authenticated user
router.get(
  "/:id",
  authorized,
  recordsController.getRecordById
);


// =========================================================
// CREATE RECORD
// =========================================================

// Create a health record
// ADMIN + STAFF
router.post(
  "/",
  authorized,
  requireRole("sysadmin", "staff"),
  validateData(createRecordSchema),
  recordsController.createRecord
);


// =========================================================
// UPDATE RECORD
// =========================================================

// Update a health record
// ADMIN + STAFF
router.put(
  "/:id",
  authorized,
  requireRole("sysadmin", "staff"),
  validateData(updateRecordSchema),
  recordsController.updateRecord
);


// =========================================================
// DELETE RECORD
// =========================================================

// Delete a health record
// ADMIN ONLY
router.delete(
  "/:id",
  authorized,
  requireRole("sysadmin"),
  recordsController.deleteRecord
);


// =========================================================
// AUTO-ARCHIVE
// =========================================================

// Automatically archive old records
// ADMIN ONLY
router.post(
  "/auto-archive",
  authorized,
  requireRole("sysadmin"),
  recordsController.autoArchiveRecords
);


module.exports = router;