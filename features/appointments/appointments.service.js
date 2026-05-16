const { db } = require('../../configs/firebase-admin');
const notificationsService = require('../notifications/notifications.service');

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
  const appointment = { id: docRef.id, ...newDoc };

  // Notify admins about new appointment request
  await notificationsService.notifyAdmins({
    type: "appointment_request",
    title: "New Appointment Request",
    message: `New appointment request from ${data.patientName || data.studentName || 'Unknown'}`,
    referenceId: appointment.id,
    referenceType: "appointment",
  });

  return appointment;
};

exports.updateAppointment = async (id, data) => {
  const doc = await db.collection('appointments').doc(id).get();
  const existingData = doc.data();

  await db.collection('appointments').doc(id).update(data);

  // Notify user about status change
  if (data.status && data.status !== existingData?.status) {
    const userId = existingData?.userId;
    if (userId) {
      await notificationsService.createNotification({
        type: "appointment_status",
        title: "Appointment Status Updated",
        message: `Your appointment has been ${data.status.toLowerCase()}`,
        userId,
        referenceId: id,
        referenceType: "appointment",
      });
    }
  }

  return { id, ...data };
};

exports.deleteAppointment = async (id) => {
  await db.collection('appointments').doc(id).delete();
  return { id };
};