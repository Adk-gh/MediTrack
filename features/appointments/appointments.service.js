const { db } = require('../../configs/firebase-admin');

exports.getAllAppointments = async () => {
  const snapshot = await db.collection('appointments').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

exports.getAppointmentsByDate = async (day) => {
  const snapshot = await db.collection('appointments').where('day', '==', parseInt(day)).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

exports.createAppointment = async (data) => {
  const newDoc = {
    ...data,
    status: "Pending",
    createdAt: new Date().toISOString(),
  };
  const docRef = await db.collection('appointments').add(newDoc);
  return { id: docRef.id, ...newDoc };
};

exports.updateAppointment = async (id, data) => {
  await db.collection('appointments').doc(id).update(data);
  return { id, ...data };
};

exports.deleteAppointment = async (id) => {
  await db.collection('appointments').doc(id).delete();
  return { id };
};