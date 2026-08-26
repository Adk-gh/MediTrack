// C:\Users\HP\MediTrack\features\notifications\notifications.controller.js

const notificationsService = require('./notifications.service');

// ============================================================
// HELPERS
// ============================================================

const resolveUserId = (req) => {
  return req.user?.uid || req.user?.id || null;
};

const resolveActorName = (req) => {
  const fullName = [
    req.user?.first_name || req.user?.firstName,
    req.user?.middle_name || req.user?.middleName,
    req.user?.last_name || req.user?.lastName,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(' ');

  return fullName || req.user?.email || 'System User';
};

const setAuditData = (res, description, details = {}) => {
  res.locals.auditDescription = description;
  res.locals.auditDetails = details;
};

// ============================================================
// GET NOTIFICATIONS
// ============================================================

const getNotifications = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user could not be identified.',
      });
    }

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100
    );

    const notifications =
      await notificationsService.getNotifications(
        userId,
        limit
      );

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET UNREAD COUNT
// ============================================================

const getUnreadCount = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user could not be identified.',
      });
    }

    const count =
      await notificationsService.getUnreadCount(
        userId
      );

    return res.status(200).json({
      success: true,
      data: count,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// MARK ONE NOTIFICATION AS READ
// ============================================================

const markAsRead = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user could not be identified.',
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required.',
      });
    }

    const result =
      await notificationsService.markAsRead(
        id,
        userId
      );

    setAuditData(
      res,
      `Marked notification ${id} as read.`,
      {
        operation: 'mark_notification_read',
        notificationId: id,
        userId,
        updatedBy: resolveActorName(req),
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: result || {
        id,
        isRead: true,
      },
    });
  } catch (error) {
    if (
      error.status === 404 ||
      error.statusCode === 404
    ) {
      return res.status(404).json({
        success: false,
        message:
          error.message ||
          'Notification not found.',
      });
    }

    next(error);
  }
};

// ============================================================
// MARK ALL NOTIFICATIONS AS READ
// ============================================================

const markAllAsRead = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user could not be identified.',
      });
    }

    const result =
      await notificationsService.markAllAsRead(
        userId
      );

    const updatedCount =
      result?.count ??
      result?.updatedCount ??
      result?.length ??
      null;

    setAuditData(
      res,
      updatedCount !== null
        ? `Marked ${updatedCount} notification${
            updatedCount === 1 ? '' : 's'
          } as read.`
        : 'Marked all notifications as read.',
      {
        operation: 'mark_all_notifications_read',
        userId,
        updatedCount,
        updatedBy: resolveActorName(req),
      }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: result || null,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE NOTIFICATION
// ============================================================

const deleteNotification = async (
  req,
  res,
  next
) => {
  try {
    const userId = resolveUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user could not be identified.',
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required.',
      });
    }

    const isSysAdmin =
      String(req.user?.role || '')
        .trim()
        .toLowerCase() === 'sysadmin';

    const result =
      await notificationsService.deleteNotification(
        id,
        userId,
        isSysAdmin
      );

    setAuditData(
      res,
      `Deleted notification with ID ${id}.`,
      {
        operation: 'delete_notification',
        notificationId: id,
        userId,
        deletedBy: resolveActorName(req),
        deletedAsSysAdmin: isSysAdmin,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Notification deleted',
      data: result || {
        id,
      },
    });
  } catch (error) {
    if (
      error.status === 404 ||
      error.statusCode === 404
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.status === 403 ||
      error.statusCode === 403
    ) {
      return res.status(403).json({
        success: false,
        message:
          error.message ||
          'You are not allowed to delete this notification.',
      });
    }

    next(error);
  }
};

// ============================================================
// CREATE TEST NOTIFICATION
// ============================================================

const createTestNotification = async (
  req,
  res,
  next
) => {
  try {
    const {
      userId,
      type,
      title,
      message,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID is required.',
      });
    }

    const notification =
      await notificationsService.createNotification({
        userId,
        type: type || 'test',
        title: title || 'Test Notification',
        message:
          message ||
          'This is a test notification.',
      });

    const notificationId =
      notification?.id || null;

    setAuditData(
      res,
      notificationId
        ? `Created test notification with ID ${notificationId} for user ${userId}.`
        : `Created a test notification for user ${userId}.`,
      {
        operation: 'create_test_notification',
        notificationId,
        targetUserId: userId,
        type:
          notification?.type ||
          type ||
          'test',
        title:
          notification?.title ||
          title ||
          'Test Notification',
        createdBy: resolveActorName(req),
      }
    );

    return res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createTestNotification,
};