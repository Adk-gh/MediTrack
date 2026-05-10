// C:\Users\HP\MediTrack\features\user\user.service.js

const { db, auth } = require('../../configs/firebase-admin');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Resolves role by scanning raw OCR text directly.
 * Keywords are ordered by priority (most specific first).
 * Returns a lowercase role string for Firestore.
 */
function resolveRole(parsedRole, rawText) {
  const combined = `${parsedRole || ''} ${rawText || ''}`.toLowerCase();

  console.log(`>>> [Role] Combined text for detection:\n"${combined.substring(0, 300)}"\n`);

  // Ordered keyword map (first match wins)
  const keywordMap = [
    // Medical
    ['physician',      'doctor'],
    ['medical doctor', 'doctor'],
    ['doctor',         'doctor'],
    [' md ',           'doctor'],   // space-padded to avoid matching "cmd"
    ['dentist',        'dentist'],
    ['dental',         'dentist'],
    ['nurse',          'nurse'],
    // Academic
    ['lecturer',       'lecturer'],
    ['professor',      'professor'],
    ['prof.',          'professor'],
    ['instructor',     'instructor'],
    ['administrator',  'administrator'],
    [' admin ',        'administrator'],
    ['librarian',      'librarian'],
    // Staff
    ['technician',     'technician'],
    ['security',       'guard'],
    ['guard',          'guard'],
    ['maintenance',    'staff'],
    ['janitor',        'staff'],
    ['cleaner',        'staff'],
    ['employee',       'staff'],
    ['faculty',        'staff'],
    ['staff',          'staff'],
    // Student (lowest priority)
    ['bsit',    'student'], ['bsis',   'student'], ['bsba',  'student'],
    ['bsed',    'student'], ['bscs',   'student'], ['bscrim','student'],
    ['bshm',    'student'], ['bsent',  'student'], ['bsoa',  'student'],
    ['student', 'student'],
  ];

  for (const [keyword, role] of keywordMap) {
    if (combined.includes(keyword)) {
      console.log(`>>> [Role] Matched keyword "${keyword}" → role: "${role}"`);
      return role;
    }
  }

  console.log('>>> [Role] No keyword matched — defaulting to "student"');
  return 'student';
}

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

  // ── 1. SEND IMAGE TO OCR SERVICE ────────────────────────────────────────
  const ocrForm = new FormData();
  ocrForm.append('image', idFile.buffer, {
    filename: idFile.originalname,
    contentType: idFile.mimetype,
  });

  let ocrResponse;
  try {
    const ocrUrl = process.env.OCR_SERVICE_URL || 'http://localhost:5001/ocr';
    ocrResponse = await axios.post(ocrUrl, ocrForm, {
      headers: { ...ocrForm.getHeaders() },
      timeout: 120000,
    });
  } catch (ocrErr) {
    console.error('OCR Service Connection Failed:', ocrErr.message);
    const error = new Error('ID verification service is unavailable.');
    error.statusCode = 502;
    throw error;
  }

  const ocrData = ocrResponse.data;

  // Full OCR debug log
  console.log('>>> [OCR] Full response:');
  console.log(JSON.stringify(ocrData, null, 2));

  if (!ocrData.success) {
    const error = new Error(ocrData.error || 'OCR Failed to process the image.');
    error.statusCode = 400;
    throw error;
  }

  // ── 2. ID NUMBER MATCHING ────────────────────────────────────────────────
  const { parsed, raw_text } = ocrData;   // ← raw_text is now pulled here

  const normalize = (id) => (id || '').toString().replace(/[^a-z0-9]/gi, '').toLowerCase();
  const normalizedInputId = normalize(universityId);
  let ocrId = parsed?.id_number || null;

  // Fallback: scan raw_text directly if parsed id_number is missing
  if (!ocrId && raw_text) {
    const normalizedRawText = normalize(raw_text);
    if (normalizedRawText.includes(normalizedInputId)) {
      ocrId = universityId;
    } else {
      const match = raw_text.match(/\b([A-Z0-9]{2,}[\s\-]?[0-9]{2,})\b/i);
      if (match) ocrId = match[1];
    }
  }

  console.log(`>>> [ID] Input: "${universityId}" | OCR detected: "${ocrId}"`);
  console.log(`>>> [ID] Normalized input: "${normalizedInputId}" | Normalized OCR: "${normalize(ocrId)}"`);

  if (!ocrId || normalizedInputId !== normalize(ocrId)) {
    const error = new Error(
      `Verification Failed: ID on card (${ocrId || 'Not Found'}) does not match your input.`
    );
    error.statusCode = 400;
    throw error;
  }

  // ── 3. ROLE RESOLUTION ───────────────────────────────────────────────────
  // Scans BOTH parsed.role AND raw_text — fixes the hardcoded 'student' bug.
  const role = resolveRole(parsed?.role, raw_text);
  console.log(`>>> [Role] Final role saved to DB: "${role}"`);

  // ── 4. FIRESTORE DUPLICATE CHECK ─────────────────────────────────────────
  const usersRef = db.collection('users');
  const duplicateIdCheck = await usersRef.where('universityId', '==', ocrId).get();
  if (!duplicateIdCheck.empty) {
    const error = new Error('This University ID is already registered.');
    error.statusCode = 400;
    throw error;
  }

  // ── 5. CREATE FIREBASE AUTH ACCOUNT ─────────────────────────────────────
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password,
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

  // ── 6. SAVE USER TO FIRESTORE ────────────────────────────────────────────
  const newUser = {
    uid: userRecord.uid,
    firstName,
    lastName,
    middleInitial: middleInitial || '',
    suffix: suffix || '',
    email: email.toLowerCase(),
    universityId: ocrId,
    isVerified: true,
    role,               // ← dynamically resolved from OCR (no longer hardcoded)
    isProfileSetup: false,
    // New students default to Regular; updated during profile setup
    studentClassification: role === 'student' ? 'Regular' : '',
    createdAt: new Date().toISOString(),
  };

  await usersRef.doc(userRecord.uid).set(newUser);
  console.log(`>>> [DB] User saved with role: "${role}"`);

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

  const {
    firstName, middleInitial, lastName, suffix,
    birthday, age, sex, bloodType,
    homeAddress, religion, nationality, civilStatus,
    universityId, department, program, yearLevel, section,
    studentClassification,  // ← NEW
    classification, jobTitle,
    phoneNumber,
    emergencyContact,
    vaccinations,
    role,
  } = profileData;

  // Determine if this user is a student (use submitted role or fall back to stored role)
  const resolvedRole = (role || userSnap.data()?.role || 'student').toLowerCase();
  const isStudent = resolvedRole === 'student';

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

    // Student classification — only meaningful for students; empty string for staff
    studentClassification: isStudent
      ? (studentClassification ?? 'Regular')
      : '',

    classification: classification ?? '',
    jobTitle:       jobTitle       ?? '',

    // Contact
    phoneNumber: phoneNumber ?? '',

    // Emergency Contact (stored as full nested object)
    emergencyContact: {
      name:         emergencyContact?.name         ?? '',
      relationship: emergencyContact?.relationship ?? '',
      phone:        emergencyContact?.phone        ?? '',
      address:      emergencyContact?.address      ?? '',
    },

    // COVID-19 Vaccinations (fixed 4-dose structure)
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

    // Status flags
    isProfileSetup: true,
    profileComplete: true,
    updatedAt: new Date().toISOString(),
  };

  console.log(`[setupProfile] Saving profile for uid: ${userId}`);
  console.log(JSON.stringify(sanitized, null, 2));

  // Use set() with merge:true (NOT update()) to safely write nested objects
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
      studentClassification: 'Regular', // ← default for new Google sign-in users
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