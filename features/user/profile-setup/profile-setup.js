// C:\Users\HP\MediTrack\features\user\profile-setup\profile-setup.js

const express = require('express');
const router = express.Router();
const multer = require('multer');

const { db } = require('../../../configs/firebase-admin');
const { authorized } = require('../../../middleware/authorized');

console.log('[profile-setup] ✅ NEW ROUTER LOADED'); // Remove after confirming it works

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * POST /api/user/profile-setup
 * Saves the complete user profile to Firestore.
 */
router.post('/', authorized, upload.single('image'), async (req, res) => {
  try {
    const uid = req.user.uid;

    // Parse body — when sent as JSON, req.body is already an object.
    // When sent as multipart/form-data, nested objects arrive as strings and need parsing.
    const body = req.body;

    console.log('[profile-setup] Raw req.body:', JSON.stringify(body, null, 2));

    const parseField = (value) => {
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return value; }
      }
      return value;
    };

    // ── Destructure every field the frontend sends ─────────────────────────
    const {
      // Personal
      firstName, middleInitial, lastName, suffix,
      birthday, age, sex, bloodType,
      homeAddress, religion, nationality, civilStatus,

      // Academic / Work
      universityId, department, program, yearLevel, section,
      classification, jobTitle,

      // Contact
      email, phoneNumber,

      // Role
      role,
    } = body;

    // Nested fields — parse in case they arrived as a JSON string (multipart)
    const emergencyContact = parseField(body.emergencyContact) || {};
    const vaccinations     = parseField(body.vaccinations)     || {};

    // ── Build the sanitized Firestore document ─────────────────────────────
    const userRole = (role || 'student').toLowerCase();

    const updateData = {
      // Personal
      firstName:     firstName     || '',
      middleInitial: middleInitial || '',
      lastName:      lastName      || '',
      suffix:        suffix        || '',
      birthday:      birthday      || '',
      age:           age           || '',
      sex:           sex           || '',
      bloodType:     bloodType     || '',
      homeAddress:   homeAddress   || '',
      religion:      religion      || '',
      nationality:   nationality   || '',
      civilStatus:   civilStatus   || '',

      // Contact
      phoneNumber: phoneNumber || '',

      // Emergency Contact (full nested object)
      emergencyContact: {
        name:         emergencyContact.name         || '',
        relationship: emergencyContact.relationship || '',
        phone:        emergencyContact.phone        || '',
        address:      emergencyContact.address      || '',
      },

      // COVID-19 Vaccinations (full nested object — all 5 doses)
      vaccinations: {
        dose1:    { vaccineName: vaccinations.dose1?.vaccineName    || '', date: vaccinations.dose1?.date    || '' },
        dose2:    { vaccineName: vaccinations.dose2?.vaccineName    || '', date: vaccinations.dose2?.date    || '' },
        booster1: { vaccineName: vaccinations.booster1?.vaccineName || '', date: vaccinations.booster1?.date || '' },
        booster2: { vaccineName: vaccinations.booster2?.vaccineName || '', date: vaccinations.booster2?.date || '' },
      },

      // Status flags
      isProfileSetup: true,
      profileComplete: true,
      updatedAt: new Date().toISOString(),
    };

    // Role-specific academic / work fields
if (userRole === 'student') {
      updateData.universityId = universityId || '';
      updateData.department = department || '';
      updateData.program    = program    || '';
      updateData.yearLevel  = yearLevel  || '';
      updateData.section    = section    || '';
    } else {
      updateData.classification = classification || '';
      updateData.department     = department     || '';
      updateData.jobTitle       = jobTitle       || '';
    }

    console.log(`[profile-setup] uid: ${uid} | role: ${userRole}`);
    console.log('[profile-setup] Writing to Firestore:', JSON.stringify(updateData, null, 2));

    // ── Write to Firestore ─────────────────────────────────────────────────
    // set() + merge:true writes nested objects as proper Firestore Maps.
    // update() would flatten them with dot-notation and silently drop sub-fields.
    const userRef = db.collection('users').doc(uid);
    await userRef.set(updateData, { merge: true });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
    });

  } catch (error) {
    console.error('[profile-setup] Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;