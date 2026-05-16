const express = require("express");
const router = express.Router();
const notificationsController = require("./notifications.controller");
const { authorized } = require("../../middleware/authorized");

router.get("/", authorized, notificationsController.getNotifications);
router.get("/unread-count", authorized, notificationsController.getUnreadCount);
router.put("/:id/read", authorized, notificationsController.markAsRead);
router.put("/read-all", authorized, notificationsController.markAllAsRead);
router.delete("/:id", authorized, notificationsController.deleteNotification);

module.exports = router;