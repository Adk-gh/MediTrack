// C:\Users\HP\MediTrack\features/user/profile-setup/profile-setup.js

const express = require('express');
const router = express.Router();
const multer = require('multer');

const supabase = require('../../../configs/database');
const { authorized } = require('../../../middleware/authorized');

console.log('[profile-setup] ✅ NEW ROUTER LOADED');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/', authorized, upload.single('image'), async (req, res) => {
  try {
    const uid = req.user.uid;
    const body = req.body;

    console.log('[profile-setup] Raw req.body:', JSON.stringify(body, null, 2));

    const parseField = (value) => {
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return value; }
      }
      return value;
    };

    const {
      firstName, middleName, lastName, suffix,
      birthday, age, sex, bloodType,
      homeAddress, religion, nationality, civilStatus,
      universityId, department, program, yearLevel, section,
      studentClassification, classification, jobTitle,
      email, phoneNumber, role,
    } = body;

    console.log('>>> [DEBUG] studentClassification from body:', studentClassification);
    console.log('>>> [DEBUG] role from body:', role);

    const emergencyContact = parseField(body.emergencyContact) || {};
    const vaccinations = parseField(body.vaccinations) || {};

    const userRole = (role || 'student').toLowerCase();
    console.log('>>> [DEBUG] userRole evaluated as:', userRole);
    console.log('>>> [DEBUG] userRole === student?', userRole === 'student');

    const updateData = {
      first_name: firstName || '',
      middle_name: middleName || '',
      last_name: lastName || '',
      suffix: suffix || '',
      birthday: birthday || '',
      age: age || '',
      sex: sex || '',
      bloodType: bloodType || '',
      homeAddress: homeAddress || '',
      religion: religion || '',
      nationality: nationality || '',
      civilStatus: civilStatus || '',
      phoneNumber: phoneNumber || '',
      emergencyContact: {
        name: emergencyContact.name || '',
        relationship: emergencyContact.relationship || '',
        phone: emergencyContact.phone || '',
        address: emergencyContact.address || '',
      },
      vaccinations: {
        dose1: { vaccineName: vaccinations.dose1?.vaccineName || '', date: vaccinations.dose1?.date || '' },
        dose2: { vaccineName: vaccinations.dose2?.vaccineName || '', date: vaccinations.dose2?.date || '' },
        booster1: { vaccineName: vaccinations.booster1?.vaccineName || '', date: vaccinations.booster1?.date || '' },
        booster2: { vaccineName: vaccinations.booster2?.vaccineName || '', date: vaccinations.booster2?.date || '' },
      },
      isProfileSetup: true,
      profileComplete: true,
      updatedAt: new Date().toISOString(),
    };

    if (userRole === 'student') {
      updateData.universityId = universityId || '';
      updateData.department = department || '';
      updateData.program = program || '';
      updateData.yearLevel = yearLevel || '';
      updateData.section = section || '';
      updateData.studentClassification = studentClassification || 'Regular';
      console.log('>>> [DEBUG] updateData.studentClassification:', updateData.studentClassification);
    } else {
      updateData.classification = classification || '';
      updateData.department = department || '';
      updateData.jobTitle = jobTitle || '';
      console.log('>>> [DEBUG] non-student branch taken — studentClassification NOT written');
    }

    console.log(`[profile-setup] uid: ${uid} | role: ${userRole}`);
    console.log('[profile-setup] Writing to Supabase:', JSON.stringify(updateData, null, 2));

    // Write to Supabase
    const { data, error } = await supabase
      .from('users')
      .upsert({ uid, ...updateData }, { onConflict: 'uid' })
      .select()
      .single();

    if (error) {
      console.error('[profile-setup] Supabase error:', error);
      throw error;
    }

    console.log('>>> [DEBUG] Supabase after write — studentClassification:', data?.studentClassification);

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