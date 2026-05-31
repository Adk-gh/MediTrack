// C:\Users\HP\MediTrack\features\notifications\notifications.route.js
const express = require("express");
const router = express.Router();
const notificationsController = require("./notifications.controller");
const { authorized } = require("../../middleware/authorized");

// 1. Import the audit logger
const { auditLog } = require("../../middleware/auditLogger");

// GET requests: We skip the logger here so we don't spam the database
router.get("/", authorized, notificationsController.getNotifications);
router.get("/unread-count", authorized, notificationsController.getUnreadCount);

// PUT: Log marking a single notification as read
router.put(
  "/:id/read",
  authorized,
  auditLog("read", "system", (req) => `Marked notification ID ${req.params.id} as read`),
  notificationsController.markAsRead
);

// PUT: Log marking all notifications as read
router.put(
  "/read-all",
  authorized,
  auditLog("update", "system", "Marked all notifications as read"),
  notificationsController.markAllAsRead
);

// DELETE: Log deleting a notification
router.delete(
  "/:id",
  authorized,
  auditLog("delete", "system", (req) => `Deleted notification ID ${req.params.id}`),
  notificationsController.deleteNotification
);

module.exports = router;