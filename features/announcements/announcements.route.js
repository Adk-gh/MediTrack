// C:\Users\HP\MediTrack\features\announcements\announcements.route.js

const express = require("express");
const router = express.Router();

const announcementsController = require("./announcements.controller");
const { authorized } = require("../../middleware/authorized");
const { getSystemConfig } = require("../../services/systemConfig.service");

const validateData = require("../../validation/validate-data");

const {
  createAnnouncementSchema,
  updateAnnouncementSchema
} = require("./announcements.validation");

const { auditLog } = require("../../middleware/auditLogger");

// =========================================================
// DYNAMIC ROLE MIDDLEWARES
// =========================================================

// Allows Admin Roles + Clinic Staffs (for managing announcements)
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

// Only sysadmin/clinic staffs can create announcements
router.post(
  "/",
  authorized,
  allowDynamicClinicStaffs,
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

// Only sysadmin/clinic staffs can update announcements
router.put(
  "/:id",
  authorized,
  allowDynamicClinicStaffs,
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

// Only sysadmin/clinic staffs can archive announcements
router.delete(
  "/:id",
  authorized,
  allowDynamicClinicStaffs,
  auditLog(
    "delete",
    "announcement",
    (req) =>
      `Archived announcement ID: ${req.params.id}`
  ),
  announcementsController.deleteAnnouncement
);

module.exports = router;