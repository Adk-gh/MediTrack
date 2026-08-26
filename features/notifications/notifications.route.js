// C:\Users\HP\MediTrack\features\notifications\notifications.route.js

const express = require('express');

const router = express.Router();

const notificationsController = require('./notifications.controller');

const {
  authorized,
} = require('../../middleware/authorized');

const {
  auditLog,
} = require('../../middleware/auditLogger');

const {
  getSystemConfig,
} = require('../../services/systemConfig.service');

// =========================================================
// HELPERS
// =========================================================

const normalizeRole = (role) => {
  return String(role || '')
    .trim()
    .toLowerCase();
};

const normalizeConfiguredRoles = (roles) => {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map(normalizeRole)
    .filter(Boolean);
};

// =========================================================
// DYNAMIC ADMIN ROLE MIDDLEWARE
// =========================================================

const allowDynamicAdmin = async (
  req,
  res,
  next
) => {
  try {
    const userRole = normalizeRole(
      req.user?.role
    );

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. No role found.',
      });
    }

    const config = await getSystemConfig();

    const adminRoles =
      normalizeConfiguredRoles(
        config?.admin_roles
      );

    const allowedRoles = [
      ...new Set([
        ...adminRoles,
        'sysadmin',
      ]),
    ];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message:
        'Access denied. Admin privileges required.',
    });
  } catch (error) {
    console.error(
      '[DynamicRoleCheck] Admin verification failed:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Internal server error during role validation.',
    });
  }
};

// =========================================================
// GET NOTIFICATIONS
// =========================================================

router.get(
  '/',
  authorized,
  notificationsController.getNotifications
);

// Keep this static route before "/:id".
router.get(
  '/unread-count',
  authorized,
  notificationsController.getUnreadCount
);

// =========================================================
// TEST NOTIFICATION
// =========================================================

router.post(
  '/test',
  authorized,
  allowDynamicAdmin,

  auditLog(
    'Create Test Notification',
    'NOTIFICATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Created a test notification for user ${
          req.body?.userId || 'unknown'
        }.`
      );
    }
  ),

  notificationsController.createTestNotification
);

// =========================================================
// MARK ALL AS READ
// =========================================================

// Keep this static route before "/:id/read".
router.put(
  '/read-all',
  authorized,

  auditLog(
    'Mark All Notifications Read',
    'NOTIFICATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        'Marked all notifications as read.'
      );
    }
  ),

  notificationsController.markAllAsRead
);

// Optional PATCH alias.
router.patch(
  '/read-all',
  authorized,

  auditLog(
    'Mark All Notifications Read',
    'NOTIFICATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        'Marked all notifications as read.'
      );
    }
  ),

  notificationsController.markAllAsRead
);

// =========================================================
// MARK ONE AS READ
// =========================================================

router.put(
  '/:id/read',
  authorized,

  auditLog(
    'Mark Notification Read',
    'NOTIFICATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Marked notification ${req.params.id} as read.`
      );
    }
  ),

  notificationsController.markAsRead
);

// Optional PATCH alias.
router.patch(
  '/:id/read',
  authorized,

  auditLog(
    'Mark Notification Read',
    'NOTIFICATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Marked notification ${req.params.id} as read.`
      );
    }
  ),

  notificationsController.markAsRead
);

// =========================================================
// DELETE NOTIFICATION
// =========================================================

router.delete(
  '/:id',
  authorized,

  auditLog(
    'Delete Notification',
    'NOTIFICATION',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Deleted notification with ID ${req.params.id}.`
      );
    }
  ),

  notificationsController.deleteNotification
);

module.exports = router;