// C:\Users\HP\MediTrack\features\announcements\announcements.route.js

const express = require("express");
const router = express.Router();

const announcementsController = require("./announcements.controller");
const { authorized } = require("../../middleware/authorized");
const { requireRole } = require("../../middleware/roleBasedAccess");

const validateData = require("../../validation/validate-data");

const {
  createAnnouncementSchema,
  updateAnnouncementSchema
} = require("./announcements.validation");

const { auditLog } = require("../../middleware/auditLogger");

// ─────────────────────────────────────────────────────────────
// READ ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────

// Get all announcements
// Anyone can view announcements
router.get(
  "/",
  announcementsController.getAllAnnouncements
);

// Get a specific announcement
// Anyone can view announcements
router.get(
  "/:id",
  announcementsController.getAnnouncementById
);

// ─────────────────────────────────────────────────────────────
// CREATE ANNOUNCEMENT
// ─────────────────────────────────────────────────────────────

// Only sysadmin/staff can create announcements
router.post(
  "/",
  authorized,
  requireRole(["sysadmin", "staff"]),
  auditLog(
    "create",
    "announcement",
    (req) =>
      `Created announcement: ${req.body.title || "Untitled"}`
  ),
  validateData(createAnnouncementSchema),
  announcementsController.createAnnouncement
);

// ─────────────────────────────────────────────────────────────
// UPDATE ANNOUNCEMENT
// ─────────────────────────────────────────────────────────────

// Only sysadmin/staff can update announcements
router.put(
  "/:id",
  authorized,
  requireRole(["sysadmin", "staff"]),
  auditLog(
    "update",
    "announcement",
    (req) =>
      `Updated announcement ID: ${req.params.id}`
  ),
  validateData(updateAnnouncementSchema),
  announcementsController.updateAnnouncement
);

// ─────────────────────────────────────────────────────────────
// DELETE / ARCHIVE ANNOUNCEMENT
// ─────────────────────────────────────────────────────────────

// Only sysadmin/staff can archive announcements
router.delete(
  "/:id",
  authorized,
  requireRole(["sysadmin", "staff"]),
  auditLog(
    "delete",
    "announcement",
    (req) =>
      `Archived announcement ID: ${req.params.id}`
  ),
  announcementsController.deleteAnnouncement
);

module.exports = router;