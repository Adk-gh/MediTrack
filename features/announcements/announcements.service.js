//C:\Users\HP\MediTrack\features\announcements\announcements.service.js
const { db, admin } = require('../../configs/firebase-admin');

// ============================================================
// HELPER: UPLOAD BASE64 TO FIREBASE STORAGE
// ============================================================
const uploadImageToStorage = async (base64String) => {
  // If it's already a URL (e.g., during an edit), just return it
  if (!base64String || base64String.startsWith('http')) {
    return base64String;
  }

  // 1. Parse the Base64 string
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image format');
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const extension = mimeType.split('/')[1];

  // 2. Define the storage bucket and unique filename
  const bucket = admin.storage().bucket();
  const fileName = `announcements/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
  const file = bucket.file(fileName);

  // 3. Upload the buffer to Firebase Storage
  await file.save(buffer, {
    metadata: { contentType: mimeType },
  });

  // 4. Construct and return the public Firebase URL
  const encodedPath = encodeURIComponent(fileName);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
};


// ============================================================
// SERVICE EXPORTS
// ============================================================
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
  let imageUrl = null;

  // If an image is provided, upload it and get the URL first
  if (data.image) {
    imageUrl = await uploadImageToStorage(data.image);
  }

  const newDoc = {
    ...data,
    image: imageUrl, // Overwrite the Base64 string with the real URL
    createdAt: new Date().toISOString(),
  };

  const docRef = await db.collection('announcements').add(newDoc);
  return { id: docRef.id, ...newDoc };
};

exports.updateAnnouncement = async (id, data) => {
  let imageUrl = data.image;

  // If a new image is uploaded during an edit, process it
  if (data.image && data.image.startsWith('data:image')) {
    imageUrl = await uploadImageToStorage(data.image);
  }

  const updateData = {
    ...data,
    image: imageUrl, // Update with the new URL
    updatedAt: new Date().toISOString(),
  };

  await db.collection('announcements').doc(id).update(updateData);
  return { id, ...updateData };
};

exports.deleteAnnouncement = async (id) => {
  // Optional: Add logic here to delete the image from storage when the document is deleted
  await db.collection('announcements').doc(id).delete();
  return { id };
};