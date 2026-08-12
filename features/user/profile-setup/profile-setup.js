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

    // 1. SECURE ADMIN CHECK
    // Fetch the actual role from the database instead of trusting req.body
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('uid', uid)
      .single();

    if (userError) throw userError;

    const dbRole = (currentUser?.role || 'student').toLowerCase();

    // Bypass setup completely for admins
    if (dbRole === 'sysadmin' || dbRole === 'admin') {
      console.log(`[profile-setup] Skipping profile setup for admin: ${uid}`);
      return res.status(200).json({
        success: true,
        message: 'Admin profile bypassed successfully.',
      });
    }

    const parseField = (value) => {
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return value; }
      }
      return value;
    };

    const emergencyContact = parseField(body.emergencyContact) || {};
    const vaccinations = parseField(body.vaccinations) || {};

    // 2. FIX DATABASE COLUMNS (Convert all to snake_case)
    const updateData = {
      first_name: body.firstName || '',
      middle_name: body.middleName || '',
      last_name: body.lastName || '',
      suffix: body.suffix || '',
      birthday: body.birthday || '',
      age: body.age || '',
      sex: body.sex || '',
      blood_type: body.bloodType || '',             // Fixed
      home_address: body.homeAddress || '',         // Fixed
      religion: body.religion || '',
      nationality: body.nationality || '',
      civil_status: body.civilStatus || '',         // Fixed
      phone_number: body.phoneNumber || '',         // Fixed
      emergency_contact: {                          // Fixed
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
      is_profile_setup: true,                       // Fixed
      profile_complete: true,                       // Fixed
      updated_at: new Date().toISOString(),         // Fixed
    };

    // Role-specific fields using snake_case
    if (dbRole === 'student') {
      updateData.university_id = body.universityId || '';
      updateData.department = body.department || '';
      updateData.program = body.program || '';
      updateData.year_level = body.yearLevel || '';
      updateData.section = body.section || '';
      updateData.student_classification = body.studentClassification || 'Regular';
    } else {
      updateData.classification = body.classification || '';
      updateData.department = body.department || '';
      updateData.job_title = body.jobTitle || '';
    }

    console.log(`[profile-setup] uid: ${uid} | role: ${dbRole}`);

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

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
    });

  } catch (error) {
    console.error('[profile-setup] Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
  }
});

module.exports = router;