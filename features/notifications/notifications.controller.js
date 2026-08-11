const notificationsService = require('./notifications.service');

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.uid || req.user.id;
    const limit = parseInt(req.query.limit, 10) || 20;
    const notifications = await notificationsService.getNotifications(userId, limit);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.uid || req.user.id;
    const count = await notificationsService.getUnreadCount(userId);
    res.status(200).json({ success: true, data: count });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    await notificationsService.markAsRead(req.params.id);
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.uid || req.user.id;
    await notificationsService.markAllAsRead(userId);
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.uid || req.user.id;
    const isSysAdmin = req.user.role === 'sysadmin';
    await notificationsService.deleteNotification(req.params.id, userId, isSysAdmin);
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const createTestNotification = async (req, res, next) => {
  try {
    const { userId, type, title, message } = req.body;

    const notification = await notificationsService.createNotification({
      userId,
      type: type || 'test',
      title: title || 'Test Notification',
      message: message || 'This is a test notification.',
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createTestNotification,
};