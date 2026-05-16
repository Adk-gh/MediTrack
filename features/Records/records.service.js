// C:\Users\HP\MediTrack\features\Records\records.service.js
const { db } = require('../../configs/firebase-admin');
const admin = require('firebase-admin');
const notificationsService = require('../notifications/notifications.service');

// Modify retrieval to query from 'users' so it correctly feeds the Front-End Records tab.
exports.getAllRecords = async () => {
  const snapshot = await db.collection('users').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

exports.getRecordById = async (id) => {
  const doc = await db.collection('users').doc(id).get();
  if (!doc.exists) {
    const error = new Error('Record not found');
    error.statusCode = 404;
    throw error;
  }
  return { id: doc.id, ...doc.data() };
};

// Refactored to act as an "Admin User Creation" Tool
exports.createRecord = async (data) => {
  try {
    // 1. Create User in Firebase Auth allowing them to log in later
    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.password || 'Plsp12345!', // Provide the manually typed password
      displayName: `${data.firstName} ${data.lastName}`.trim(),
    });

    // 2. Structurally map the data to conform exactly with the unified User Profile Model.
    const newDoc = {
  uid: userRecord.uid,
  firstName: data.firstName || '',
  lastName: data.lastName || '',
  middleInitial: data.middleInitial || '',
  suffix: data.suffix || '',
  email: data.email || '',
  universityId: data.universityId || '',
  role: data.role || 'student',
  sex: data.sex || '',           // ✅ was data.gender
  birthday: data.birthday || '', // ✅ was data.birthdate
  age: String(data.age || ''),
  department: data.department || '',
  phoneNumber: data.phoneNumber || '',
  civilStatus: data.civilStatus || '',     // ✅ missing
  nationality: data.nationality || '',     // ✅ missing
  religion: data.religion || '',           // ✅ missing
  bloodType: data.bloodType || '',
  homeAddress: data.homeAddress || '',
  emergencyContact: data.emergencyContact || {},
  vaccinations: data.vaccinations || {},
  isProfileSetup: true,
  profileComplete: true,

  ...(data.role === 'student' ? {
    program: data.program || '',
    yearLevel: data.yearLevel || '',
    section: data.section || '',
    studentClassification: data.studentClassification || '', // ✅ missing
  } : {
    jobTitle: data.jobTitle || '',
    classification: data.classification || '',
  }),

  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

    // 3. Save the document inside the 'users' collection to maintain universal sync
    await db.collection('users').doc(userRecord.uid).set(newDoc);

    // Notify admins about new user/record creation
    await notificationsService.notifyAdmins({
      type: 'record_added',
      title: 'New User Record Created',
      message: `New user: ${newDoc.firstName} ${newDoc.lastName} (${newDoc.role})`,
      referenceId: userRecord.uid,
      referenceType: 'user',
    });

    return { id: userRecord.uid, ...newDoc };
  } catch (error) {
    // Catch common errors like "Email Already in use"
    throw new Error(error.message || 'Error executing admin account creation');
  }
};

exports.updateRecord = async (id, data) => {
  const updateData = {
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection('users').doc(id).update(updateData);
  return { id, ...updateData };
};

exports.deleteRecord = async (id) => {
  // Optional: Remove from Auth in addition to the DB Document
  try {
      await admin.auth().deleteUser(id);
  } catch(e) {
      console.log('User auth already deleted or mismatch');
  }
  await db.collection('users').doc(id).delete();
  return { id };
};