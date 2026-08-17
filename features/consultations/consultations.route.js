// C:\Users\HP\MediTrack\features\consultations\consultations.route.js

const express = require("express");
const router = express.Router();

const consultationsController = require("./consultations.controller");

const { authorized: authorize } = require("../../middleware/authorized");

const { auditLog } = require("../../middleware/auditLogger");
const { getSystemConfig } = require("../../services/systemConfig.service");


// =========================================================
// DYNAMIC ROLE MIDDLEWARES
// =========================================================

// Allows Students + Dynamic Database Roles + Core Clinical Fallbacks
const allowDynamicPatients = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();

    if (!userRole) {
      return res.status(403).json({ message: "Access denied. No role found." });
    }

    // "student" is a static role. Let them through immediately.
    if (userRole === "student") {
      return next();
    }

    // Fetch the JSONB arrays from system_config
    const config = await getSystemConfig();

    // Safely extract and format arrays from the database configuration
    const clinicRoles = (config.clinic_roles || []).map(r => r.toLowerCase());
    const facultyRoles = (config.faculty_roles || []).map(r => r.toLowerCase());
    const adminRoles = (config.admin_roles || []).map(r => r.toLowerCase());

    // Combine database configuration arrays with core master safety nets
    const allowedRoles = [
      ...clinicRoles,
      ...facultyRoles,
      ...adminRoles,
      "sysadmin",
      "doctor",
      "dentist",
      "nurse",
      "faculty"
    ];

    // Check if the user's role exists in the allowed dynamic lists
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      message: "Access denied. You do not have permission to perform this action."
    });

  } catch (error) {
    console.error("[DynamicRoleCheck] Failed to verify role:", error);
    return res.status(500).json({ message: "Internal server error during role validation." });
  }
};

// Allows Admin Roles + Clinic Staffs (for ending consultations)
const allowDynamicClinicStaffs = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!userRole) {
      return res.status(403).json({ message: "Access denied. No role found." });
    }

    const config = await getSystemConfig();

    const clinicRoles = (config.clinic_roles || []).map(r => r.toLowerCase());
    const adminRoles = (config.admin_roles || []).map(r => r.toLowerCase());

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

// Allows Admin Roles ONLY (for archiving consultations)
const allowDynamicAdmin = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!userRole) {
      return res.status(403).json({ message: "Access denied. No role found." });
    }

    const config = await getSystemConfig();

    const adminRoles = (config.admin_roles || []).map(r => r.toLowerCase());

    const allowedRoles = [
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
      message: "Access denied. Admin privileges required."
    });
  } catch (error) {
    console.error("[DynamicRoleCheck] Admin verification failed:", error);
    return res.status(500).json({ message: "Internal server error during role validation." });
  }
};


// =========================================================
// AUTHENTICATION
// =========================================================

router.use(authorize);


// =========================================================
// PRESENCE
// =========================================================

router.post(
  "/presence",
  consultationsController.setPresence
);

router.get(
  "/presence/online",
  consultationsController.getOnlineUsers
);

router.get(
  "/presence",
  consultationsController.getPresence
);


// =========================================================
// CONSULTATIONS
// =========================================================

router.get(
  "/",
  consultationsController.getAllConsultations
);

router.get(
  "/patient",
  consultationsController.getConsultationsByPatient
);

router.post(
  "/",
  allowDynamicPatients,
  auditLog(
    "create",
    "consultation",
    (req) =>
      `Created new consultation: ${
        req.body.consultation_type || "Unknown"
      }`
  ),
  consultationsController.createConsultation
);

router.get(
  "/:id",
  consultationsController.getConsultationById
);

router.put(
  "/:id",
  allowDynamicPatients,
  auditLog(
    "update",
    "consultation",
    (req) =>
      `Updated consultation ID: ${req.params.id}`
  ),
  consultationsController.updateConsultation
);

router.put(
  "/:id/reactivate",
  allowDynamicPatients,
  auditLog(
    "update",
    "consultation",
    (req) =>
      `Reactivated consultation ID: ${req.params.id}`
  ),
  consultationsController.reactivateConsultation
);

router.put(
  "/:id/end",
  allowDynamicClinicStaffs,
  auditLog(
    "end",
    "consultation",
    (req) =>
      `Ended consultation ID: ${req.params.id}`
  ),
  consultationsController.endConsultation
);

router.patch(
  "/:id/end",
  allowDynamicClinicStaffs,
  auditLog(
    "end",
    "consultation",
    (req) =>
      `Ended consultation ID: ${req.params.id}`
  ),
  consultationsController.endConsultation
);

router.delete(
  "/:id",
  allowDynamicAdmin,
  auditLog(
    "delete",
    "consultation",
    (req) =>
      `Archived consultation ID: ${req.params.id}`
  ),
  consultationsController.deleteConsultation
);


// =========================================================
// CONSULTATION MESSAGES
// =========================================================

router.get(
  "/:consultationId/messages",
  consultationsController.getMessages
);

router.post(
  "/:consultationId/messages",
  auditLog(
    "create",
    "message",
    (req) =>
      `Sent message in consultation: ${
        req.params.consultationId
      }`
  ),
  consultationsController.sendMessage
);

router.post(
  "/:consultationId/messages/read",
  consultationsController.markMessagesAsRead
);


module.exports = router;