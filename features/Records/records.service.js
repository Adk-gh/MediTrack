const { db } = require('../../configs/firebase-admin');

exports.getAllRecords = async () => {
  const snapshot = await db.collection('records').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

exports.getRecordById = async (id) => {
  const doc = await db.collection('records').doc(id).get();
  if (!doc.exists) {
    const error = new Error('Record not found');
    error.statusCode = 404;
    throw error;
  }
  return { id: doc.id, ...doc.data() };
};

exports.createRecord = async (data) => {
  const newDoc = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const docRef = await db.collection('records').add(newDoc);
  return { id: docRef.id, ...newDoc };
};

exports.updateRecord = async (id, data) => {
  const updateData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await db.collection('records').doc(id).update(updateData);
  return { id, ...updateData };
};

exports.deleteRecord = async (id) => {
  await db.collection('records').doc(id).delete();
  return { id };
};