// C:\Users\HP\MediTrack\features\user\user.service.js

const { db, auth } = require('../../configs/firebase-admin');
const axios = require('axios');
const FormData = require('form-data');

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

  // 2. Role Logic
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

  // 5. Save initial profile to Firestore
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
    isProfileSetup: false,
    createdAt: new Date().toISOString(),
  };

  await usersRef.doc(userRecord.uid).set(newUser);

  return newUser;
};

exports.loginUser = async ({ email, password }) => {
  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
  if (!FIREBASE_API_KEY) throw new Error('Server configuration error: Missing API Key');

  try {
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
      token: idToken,
    };
  } catch (err) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }
};

exports.setupProfile = async (userId, profileData) => {
  if (!userId) throw new Error('userId is required for setupProfile');

  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  // --- Destructure every expected field explicitly ---
  // This prevents the client from overwriting protected fields like uid, role, isVerified.
  const {
    firstName, middleInitial, lastName, suffix,
    birthday, age, sex, bloodType,
    homeAddress, religion, nationality, civilStatus,
    universityId, department, program, yearLevel, section,
    classification, jobTitle,
    phoneNumber,
    emergencyContact,
    vaccinations,
  } = profileData;

  // --- Build a clean, sanitized object ---
  const sanitized = {
    // Personal
    firstName:     firstName     ?? '',
    middleInitial: middleInitial ?? '',
    lastName:      lastName      ?? '',
    suffix:        suffix        ?? '',
    birthday:      birthday      ?? '',
    age:           age           ?? '',
    sex:           sex           ?? '',
    bloodType:     bloodType     ?? '',
    homeAddress:   homeAddress   ?? '',
    religion:      religion      ?? '',
    nationality:   nationality   ?? '',
    civilStatus:   civilStatus   ?? '',

    // Academic / Work
    universityId:   universityId   ?? '',
    department:     department     ?? '',
    program:        program        ?? '',
    yearLevel:      yearLevel      ?? '',
    section:        section        ?? '',
    classification: classification ?? '',
    jobTitle:       jobTitle       ?? '',

    // Contact
    phoneNumber: phoneNumber ?? '',

    // ─── Emergency Contact ───────────────────────────────────────────────────
    // Stored as a FULL nested object — do NOT spread this into root-level fields.
    // Firestore .update() with dot-notation would strip sub-fields; we use
    // set+merge below to write the whole object at once.
    emergencyContact: {
      name:         emergencyContact?.name         ?? '',
      relationship: emergencyContact?.relationship ?? '',
      phone:        emergencyContact?.phone        ?? '',
      address:      emergencyContact?.address      ?? '',
    },

    // ─── COVID-19 Vaccinations ───────────────────────────────────────────────
    // Fixed 5-dose structure. Always write all 5 keys so Firestore never has
    // partial/missing doses from a previous save.
    vaccinations: {
      dose1: {
        vaccineName: vaccinations?.dose1?.vaccineName ?? '',
        date:        vaccinations?.dose1?.date        ?? '',
      },
      dose2: {
        vaccineName: vaccinations?.dose2?.vaccineName ?? '',
        date:        vaccinations?.dose2?.date        ?? '',
      },
      booster1: {
        vaccineName: vaccinations?.booster1?.vaccineName ?? '',
        date:        vaccinations?.booster1?.date        ?? '',
      },
      booster2: {
        vaccineName: vaccinations?.booster2?.vaccineName ?? '',
        date:        vaccinations?.booster2?.date        ?? '',
      },
    },

    // ─── Status flags ────────────────────────────────────────────────────────
    // isProfileSetup is the SINGLE source of truth. The frontend also sends
    // profileComplete — we accept it here as an alias for safety.
    isProfileSetup: true,
    profileComplete: true,
    updatedAt: new Date().toISOString(),
  };

  console.log(`[setupProfile] Saving profile for uid: ${userId}`);
  console.log(JSON.stringify(sanitized, null, 2));

  // ─── CRITICAL: Use set() with merge:true, NOT update() ───────────────────
  //
  // Why NOT .update()?
  //   Firestore's .update() writes nested objects using dot-notation internally,
  //   which means emergencyContact and vaccinations would be written as flat keys
  //   like "emergencyContact.name", "vaccinations.dose1.vaccineName", etc.
  //   If ANY of those sub-fields didn't exist before, the update silently drops them.
  //
  // Why set() + merge:true?
  //   It writes the entire nested object as a proper Firestore Map sub-document,
  //   and merges with existing top-level fields (like uid, role, email) without
  //   overwriting them.
  //
  await userRef.set(sanitized, { merge: true });

  const updated = await userRef.get();
  return updated.data();
};

exports.getProfile = async (userId) => {
  if (!userId) throw new Error('userId is required for getProfile');

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
      uid,
      name: name || '',
      email,
      role: 'student',
      isProfileSetup: false,
      profileComplete: false,
      createdAt: new Date().toISOString(),
    };
    await usersRef.doc(uid).set(userData);
  } else {
    userData = userDoc.data();
  }

  return {
    ...userData,
    token: idToken,
  };
};