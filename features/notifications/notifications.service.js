//C:\Users\HP\MediTrack\features\notifications\notifications.service.js
const { db } = require("../../configs/firebase-admin");// Adjust the path if needed

const COLLECTION = "notifications";

const notificationsService = {
  async createNotification(notificationData) {
    const notification = {
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      userId: notificationData.userId,
      referenceId: notificationData.referenceId,
      referenceType: notificationData.referenceType,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection(COLLECTION).add(notification);
    return { id: docRef.id, ...notification };
  },

  async getNotifications(userId, limit = 20) {
    const snapshot = await db.collection(COLLECTION)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getUnreadCount(userId) {
    const snapshot = await db.collection(COLLECTION)
      .where("userId", "==", userId)
      .where("isRead", "==", false)
      .get();

    return snapshot.size;
  },

  async markAsRead(notificationId) {
    await db.collection(COLLECTION).doc(notificationId).update({ isRead: true });
  },

  async markAllAsRead(userId) {
    const snapshot = await db.collection(COLLECTION)
      .where("userId", "==", userId)
      .where("isRead", "==", false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });
    await batch.commit();
  },

  async deleteNotification(notificationId) {
    await db.collection(COLLECTION).doc(notificationId).delete();
  },

  // Helper to create notification for admins
  async notifyAdmins(notificationData) {
    const adminUsers = await db.collection("users").where("role", "==", "admin").get();
    const batch = db.batch();

    adminUsers.docs.forEach(doc => {
      const notification = {
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        userId: doc.id,
        referenceId: notificationData.referenceId,
        referenceType: notificationData.referenceType,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      batch.set(db.collection(COLLECTION).doc(), notification);
    });

    await batch.commit();
  },
};

module.exports = notificationsService;