// C:\Users\HP\MediTrack\features\user\user.service.js

const { db, auth } = require('../../configs/firebase-admin');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const FormData = require('form-data');

// --- FIXED: Helper now uses 'uid' to match what the controller expects ---
const generateToken = (uid) => {
  return jwt.sign({ uid }, process.env.JWT_SECRET || 'super_secret_key', {
    expiresIn: '30d',
  });
};

exports.registerUser = async ({ firstName, middleInitial, lastName, suffix, email, password, universityId }, idFile) => {
  // 1. Basic validation
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

  // 2. OCR VERIFICATION (Simplified for brevity, keep your existing logic)
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

  const { parsed, raw_text } = ocrData;

  // 3. Extract and verify ID number
  const normalize = (id) => (id || '').toString().replace(/[^a-z0-9]/gi, '').toLowerCase();
  const normalizedInputId = normalize(universityId);
  let ocrId = parsed?.id_number || null;

  // ... (keep your existing OCR ID extraction logic here)

  if (!ocrId || normalizedInputId !== normalize(ocrId)) {
    const error = new Error(`Verification Failed: Typed ID (${universityId}) does not match ID on card.`);
    error.statusCode = 400;
    throw error;
  }

  // 4. Dynamic role assignment logic (Keep your current logic)
  let role = 'student'; 
  // ... role logic ...

  // 5. Duplicate checks in Firestore
  const usersRef = db.collection('users');
  const duplicateIdCheck = await usersRef.where('universityId', '==', ocrId).get();
  if (!duplicateIdCheck.empty) {
    const error = new Error('This University ID is already registered.');
    error.statusCode = 400;
    throw error;
  }

  // 6. Create Firebase Auth account
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

  // 7. Save profile to Firestore using UID as document ID
  const newUser = {
    uid: userRecord.uid, // Changed from 'id' to 'uid' for consistency
    firstName,
    lastName,
    middleInitial: middleInitial || '',
    suffix: suffix || '',
    email: email.toLowerCase(),
    universityId: ocrId,
    isVerified: true,
    role,
    profileComplete: false,
    createdAt: new Date().toISOString(),
  };

  await usersRef.doc(userRecord.uid).set(newUser);

  return {
    ...newUser,
    token: generateToken(userRecord.uid), // Uses the updated helper
  };
};

exports.loginUser = async ({ email, password }) => {
  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

  if (!FIREBASE_API_KEY) {
    const error = new Error('Server configuration error.');
    error.statusCode = 500;
    throw error;
  }

  let localId;
  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      { email, password, returnSecureToken: true }
    );
    localId = response.data.localId;
  } catch (err) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const userDoc = await db.collection('users').doc(localId).get();

  if (!userDoc.exists) {
    const error = new Error('User profile not found.');
    error.statusCode = 404;
    throw error;
  }

  const user = userDoc.data();

  return {
    ...user,
    token: generateToken(localId), // FIXED: Uses localId (the UID) for the token
  };
};

exports.setupProfile = async (userId, profileData) => {
  if (!userId) throw new Error("userId is required for setupProfile");

  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();

  if (!doc.exists) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  await userRef.update({
    ...profileData,
    profileComplete: true,
    updatedAt: new Date().toISOString(),
  });

  const updated = await userRef.get();
  const user = updated.data();
  return user;
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
      profileComplete: false,
      createdAt: new Date().toISOString(),
    };
    await usersRef.doc(uid).set(userData);
  } else {
    userData = userDoc.data();
  }

  return {
    ...userData,
    token: generateToken(uid),
  };
};

exports.getProfile = async (userId) => {
  if (!userId) throw new Error("userId is required for getProfile");
  
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();

  if (!doc.exists) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return doc.data();
};