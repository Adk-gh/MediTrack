// C:\Users\HP\MediTrack\features\notifications\notifications.route.js

const express = require("express");
const router = express.Router();

const notificationsController = require("./notifications.controller");

const { authorized } = require("../../middleware/authorized");

// Audit logger
const { auditLog } = require("../../middleware/auditLogger");
const { getSystemConfig } = require("../../services/systemConfig.service");


// =========================================================
// DYNAMIC ROLE MIDDLEWARES
// =========================================================

// Allows Admin Roles ONLY (for test notifications)
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
// ADMIN ONLY (Dynamic)
//
// Previously this endpoint had NO authentication.
// Do not leave it publicly accessible in production.
router.post(
  "/test",
  authorized,
  allowDynamicAdmin,
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