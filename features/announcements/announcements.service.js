const { db } = require('../../configs/firebase-admin');

exports.getAllAnnouncements = async () => {
  const snapshot = await db.collection('announcements').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

exports.getAnnouncementById = async (id) => {
  const doc = await db.collection('announcements').doc(id).get();
  if (!doc.exists) {
    const error = new Error('Announcement not found');
    error.statusCode = 404;
    throw error;
  }
  return { id: doc.id, ...doc.data() };
};

exports.createAnnouncement = async (data) => {
  const newDoc = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  const docRef = await db.collection('announcements').add(newDoc);
  return { id: docRef.id, ...newDoc };
};

exports.updateAnnouncement = async (id, data) => {
  await db.collection('announcements').doc(id).update(data);
  return { id, ...data };
};

exports.deleteAnnouncement = async (id) => {
  await db.collection('announcements').doc(id).delete();
  return { id };
};