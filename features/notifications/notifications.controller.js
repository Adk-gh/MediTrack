//C:\Users\HP\MediTrack\features\notifications\notifications.controller.js
const notificationsService = require("./notifications.service");

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 20;
    const notifications = await notificationsService.getNotifications(userId, limit);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const count = await notificationsService.getUnreadCount(userId);
    res.status(200).json({ success: true, data: count });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    await notificationsService.markAsRead(req.params.id);
    res.status(200).json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    await notificationsService.markAllAsRead(userId);
    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    await notificationsService.deleteNotification(req.params.id);
    res.status(200).json({ success: true, message: "Notification deleted" });
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
};