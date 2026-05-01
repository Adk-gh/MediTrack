// C:\Users\HP\MediTrack\features\user\user.service.js

const { db, auth } = require('../../configs/firebase-admin');
const axios = require('axios');
const FormData = require('form-data');

// --- REMOVED generateToken helper as we now use Firebase ID Tokens ---

exports.registerUser = async ({ firstName, middleInitial, lastName, suffix, email, password, universityId }, idFile) => {
  if (!firstName || !lastName || !email || !password || !universityId) {
    const error = new Error('Missing required fields.');
    error.statusCode = 400;
    throw error;
  }

  if (!idFile) {
    const error = new Error('Please upload your University ID image.');
    error.statusCode = 400;
    throw error;
  }

  // 1. OCR VERIFICATION
  const ocrForm = new FormData();
  ocrForm.append('image', idFile.buffer, {
    filename: idFile.originalname,
    contentType: idFile.mimetype,
  });

  let ocrResponse;
  try {
    ocrResponse = await axios.post('http://localhost:5001/ocr', ocrForm, {
      headers: { ...ocrForm.getHeaders() }
    });
  } catch (ocrErr) {
    const error = new Error('ID verification service is unavailable.');
    error.statusCode = 502;
    throw error;
  }

  const ocrData = ocrResponse.data;
  if (!ocrData.success) {
    const error = new Error(ocrData.error || 'OCR Failed to process the image.');
    error.statusCode = 400;
    throw error;
  }

  const { parsed } = ocrData;
  const normalize = (id) => (id || '').toString().replace(/[^a-z0-9]/gi, '').toLowerCase();
  const normalizedInputId = normalize(universityId);
  let ocrId = parsed?.id_number || null;

  if (!ocrId || normalizedInputId !== normalize(ocrId)) {
    const error = new Error(`Verification Failed: Typed ID (${universityId}) does not match ID on card.`);
    error.statusCode = 400;
    throw error;
  }

  // 2. Role Logic (Default to student, or apply your logic)
  let role = 'student';

  // 3. Firestore Duplicate Check
  const usersRef = db.collection('users');
  const duplicateIdCheck = await usersRef.where('universityId', '==', ocrId).get();
  if (!duplicateIdCheck.empty) {
    const error = new Error('This University ID is already registered.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Create Firebase Auth account
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: `${firstName} ${lastName}`.trim(),
    });
  } catch (firebaseErr) {
    if (firebaseErr.code === 'auth/email-already-exists') {
      const error = new Error('That email is already in use.');
      error.statusCode = 400;
      throw error;
    }
    throw firebaseErr;
  }

  // 5. Save profile to Firestore (using isProfileSetup)
  const newUser = {
    uid: userRecord.uid,
    firstName,
    lastName,
    middleInitial: middleInitial || '',
    suffix: suffix || '',
    email: email.toLowerCase(),
    universityId: ocrId,
    isVerified: true,
    role,
    isProfileSetup: false, // Updated field name
    createdAt: new Date().toISOString(),
  };

  await usersRef.doc(userRecord.uid).set(newUser);

  // Note: Frontend will handle the first login to get the token
  return newUser;
};

exports.loginUser = async ({ email, password }) => {
  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
  if (!FIREBASE_API_KEY) throw new Error('Server configuration error: Missing API Key');

  try {
    // We call the Google API to verify password and get a valid Firebase ID Token
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      { email, password, returnSecureToken: true }
    );
    
    const { localId, idToken } = response.data;

    const userDoc = await db.collection('users').doc(localId).get();
    if (!userDoc.exists) {
      const error = new Error('User profile not found.');
      error.statusCode = 404;
      throw error;
    }

    const user = userDoc.data();

    return {
      ...user,
      token: idToken, // Return the actual Firebase ID Token
    };
  } catch (err) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }
};

exports.setupProfile = async (userId, profileData) => {
  if (!userId) throw new Error("userId is required for setupProfile");

  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  // Update Firestore to mark setup as true
  await userRef.update({
    ...profileData,
    isProfileSetup: true, // Updated field name
    updatedAt: new Date().toISOString(),
  });

  const updated = await userRef.get();
  return updated.data();
};

exports.getProfile = async (userId) => {
  if (!userId) throw new Error("userId is required for getProfile");
  
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return userDoc.data();
};

exports.firebaseLogin = async (idToken) => {
  const decodedToken = await auth.verifyIdToken(idToken);
  const { uid, email, name } = decodedToken;

  const usersRef = db.collection('users');
  const userDoc = await usersRef.doc(uid).get();

  let userData;
  if (!userDoc.exists) {
    userData = {
      uid: uid,
      name: name || '',
      email: email,
      role: 'student',
      isProfileSetup: false, // Updated field name
      createdAt: new Date().toISOString(),
    };
    await usersRef.doc(uid).set(userData);
  } else {
    userData = userDoc.data();
  }

  return {
    ...userData,
    token: idToken, // Return the same token passed in
  };
};