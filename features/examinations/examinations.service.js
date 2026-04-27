const { db } = require('../../configs/firebase-admin');

exports.getAllExaminations = async () => {
  const snapshot = await db.collection('examinations').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

exports.getExaminationById = async (id) => {
  const doc = await db.collection('examinations').doc(id).get();
  if (!doc.exists) {
    const error = new Error('Examination not found');
    error.statusCode = 404;
    throw error;
  }
  return { id: doc.id, ...doc.data() };
};

exports.createExamination = async (data) => {
  const newDoc = {
    ...data,
    logs: data.logs || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const docRef = await db.collection('examinations').add(newDoc);
  return { id: docRef.id, ...newDoc };
};

exports.updateExamination = async (id, data) => {
  const updateData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await db.collection('examinations').doc(id).update(updateData);
  return { id, ...updateData };
};

exports.deleteExamination = async (id) => {
  await db.collection('examinations').doc(id).delete();
  return { id };
};