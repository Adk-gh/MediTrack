// C:\Users\HP\MediTrack\features\consultations\consultations.route.js

const express = require("express");
const router = express.Router();

const consultationsController = require("./consultations.controller");

const { authorized: authorize } = require("../../middleware/authorized");
const { requireRole } = require("../../middleware/roleBasedAccess");

const { auditLog } = require("../../middleware/auditLogger");


// =========================================================
// AUTHENTICATION
// =========================================================

// Every consultation route requires authentication
router.use(authorize);


// =========================================================
// PRESENCE
// =========================================================

// Set current user's online/offline presence
// Any authenticated user
router.post(
  "/presence",
  consultationsController.setPresence
);


// Get currently online users
// Any authenticated user
router.get(
  "/presence/online",
  consultationsController.getOnlineUsers
);


// Get presence information
// Any authenticated user
router.get(
  "/presence",
  consultationsController.getPresence
);


// =========================================================
// CONSULTATIONS
// =========================================================

// Get all consultations
// Authenticated users
//
// IMPORTANT:
// The controller should restrict the results according
// to the user's role/ownership.
router.get(
  "/",
  consultationsController.getAllConsultations
);


// Get consultations for a patient
// Authenticated users
//
// The controller should verify that the requester
// is allowed to access the requested patient.
router.get(
  "/patient",
  consultationsController.getConsultationsByPatient
);


// Create consultation
// ADMIN + STAFF
router.post(
  "/",
  requireRole("sysadmin", "staff"),

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


// Get single consultation
// Authenticated users
//
// Ownership/access should be checked by the controller.
router.get(
  "/:id",
  consultationsController.getConsultationById
);


// Update consultation
// ADMIN + STAFF
router.put(
  "/:id",
  requireRole("sysadmin", "staff"),

  auditLog(
    "update",
    "consultation",
    (req) =>
      `Updated consultation ID: ${req.params.id}`
  ),

  consultationsController.updateConsultation
);


// Reactivate consultation
// ADMIN + STAFF
router.put(
  "/:id/reactivate",
  requireRole("sysadmin", "staff"),

  auditLog(
    "update",
    "consultation",
    (req) =>
      `Reactivated consultation ID: ${req.params.id}`
  ),

  consultationsController.reactivateConsultation
);


// End consultation
// ADMIN + STAFF
router.put(
  "/:id/end",
  requireRole("sysadmin", "staff"),

  auditLog(
    "end",
    "consultation",
    (req) =>
      `Ended consultation ID: ${req.params.id}`
  ),

  consultationsController.endConsultation
);


// PATCH alternative for ending consultation
// ADMIN + STAFF
router.patch(
  "/:id/end",
  requireRole("sysadmin", "staff"),

  auditLog(
    "end",
    "consultation",
    (req) =>
      `Ended consultation ID: ${req.params.id}`
  ),

  consultationsController.endConsultation
);


// Archive consultation
// ADMIN ONLY
router.delete(
  "/:id",
  requireRole("sysadmin"),

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

// Get messages
// Authenticated users
//
// Controller should verify that the user belongs to
// or is authorized to access this consultation.
router.get(
  "/:consultationId/messages",
  consultationsController.getMessages
);


// Send message
// Authenticated users
//
// Controller should verify consultation access.
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


// Mark messages as read
// Authenticated users
router.post(
  "/:consultationId/messages/read",
  consultationsController.markMessagesAsRead
);


module.exports = router;