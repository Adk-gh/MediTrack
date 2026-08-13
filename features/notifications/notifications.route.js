// C:\Users\HP\MediTrack\features\notifications\notifications.route.js

const express = require("express");
const router = express.Router();

const notificationsController = require("./notifications.controller");

const { authorized } = require("../../middleware/authorized");
const { requireRole } = require("../../middleware/roleBasedAccess");

// Audit logger
const { auditLog } = require("../../middleware/auditLogger");


// =========================================================
// GET NOTIFICATIONS
// =========================================================

// Get current user's notifications
// Any authenticated user
router.get(
  "/",
  authorized,
  notificationsController.getNotifications
);


// Get unread notification count
// Any authenticated user
router.get(
  "/unread-count",
  authorized,
  notificationsController.getUnreadCount
);


// =========================================================
// TEST NOTIFICATION
// =========================================================

// Test endpoint
// ADMIN ONLY
//
// Previously this endpoint had NO authentication.
// Do not leave it publicly accessible in production.
router.post(
  "/test",
  authorized,
  requireRole("sysadmin"),
  auditLog(
    "create",
    "system",
    "Created test notification"
  ),
  notificationsController.createTestNotification
);


// =========================================================
// MARK AS READ
// =========================================================

// Mark one notification as read
// Any authenticated user
router.put(
  "/:id/read",
  authorized,

  auditLog(
    "read",
    "system",
    (req) =>
      `Marked notification ID ${req.params.id} as read`
  ),

  notificationsController.markAsRead
);


// Mark all notifications as read
// Any authenticated user
router.put(
  "/read-all",
  authorized,

  auditLog(
    "update",
    "system",
    "Marked all notifications as read"
  ),

  notificationsController.markAllAsRead
);


// =========================================================
// DELETE NOTIFICATION
// =========================================================

// Delete a notification
// Any authenticated user
router.delete(
  "/:id",
  authorized,

  auditLog(
    "delete",
    "system",
    (req) =>
      `Deleted notification ID ${req.params.id}`
  ),

  notificationsController.deleteNotification
);


module.exports = router;