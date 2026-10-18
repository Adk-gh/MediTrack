// C:\Users\HP\MediTrack\routes\settingsRoutes.js

const express = require('express');
const supabase = require('../configs/database');
const { authorized } = require('../middleware/authorized');
const { getSystemConfig } = require('../services/systemConfig.service');

const router = express.Router();

// =========================================================
// DYNAMIC ROLE MIDDLEWARE
// =========================================================
const allowDynamicClinicStaffs = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!userRole) return res.status(403).json({ message: 'Access denied. No role found.' });

    const config = await getSystemConfig();
    const allowedRoles = [...(config.clinic_roles || []), ...(config.admin_roles || []), 'sysadmin', 'doctor', 'dentist', 'nurse'].map(r => String(r).toLowerCase());

    if (allowedRoles.includes(userRole)) return next();
    return res.status(403).json({ message: 'Access denied. Clinic staff or Admin privileges required.' });
  } catch (error) {
    console.error('[DynamicRoleCheck] Clinic staffs verification failed:', error);
    return res.status(500).json({ message: 'Internal server error during role validation.' });
  }
};

// =========================================================
// DOCTOR SETTINGS
// =========================================================
router.get('/doctor', authorized, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('doctor_settings').select('name, title, licenseNo, ptrNo').eq('id', 1).maybeSingle();

    if (error || !data) {
      if (error) console.warn('[DoctorSettings] Could not retrieve settings:', error);
      return res.status(200).json({ name: 'CAREN NAVATA JOSE M.D.', title: 'Medical Officer III', licenseNo: '0114665', ptrNo: '9978569' });
    }
    return res.status(200).json({ name: data.name || '', title: data.title || '', licenseNo: data.licenseNo || '', ptrNo: data.ptrNo || '' });
  } catch (error) { next(error); }
});

router.put('/doctor', authorized, allowDynamicClinicStaffs, async (req, res, next) => {
  try {
    const { name, title, licenseNo, ptrNo } = req.body;
    if (!name || !title || !licenseNo || !ptrNo) return res.status(400).json({ error: 'All fields are required.' });

    const { data, error } = await supabase.from('doctor_settings').upsert({ id: 1, name: String(name).toUpperCase(), title, licenseNo, ptrNo, updated_at: new Date().toISOString() }).select();
    if (error) { console.error('[DoctorSettings] Supabase update error:', error); return res.status(500).json({ error: 'Failed to update doctor records.' }); }

    return res.status(200).json({ message: 'Doctor settings updated successfully.', data: data?.[0] || null });
  } catch (error) { next(error); }
});

// =========================================================
// DENTIST SETTINGS
// =========================================================
router.get('/dentist', authorized, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('dentist_settings').select('name, title').eq('id', 1).maybeSingle();
    if (error || !data) {
      if (error) console.warn('[DentistSettings] Could not retrieve settings:', error);
      return res.status(200).json({ name: 'DR. JOSELITO S. REYES', title: 'DENTIST II' });
    }
    return res.status(200).json({ name: data.name || '', title: data.title || '' });
  } catch (error) { next(error); }
});

router.put('/dentist', authorized, allowDynamicClinicStaffs, async (req, res, next) => {
  try {
    const { name, title } = req.body;
    if (!name || !title) return res.status(400).json({ error: 'Name and title are required.' });

    const { data, error } = await supabase.from('dentist_settings').upsert({ id: 1, name: String(name).toUpperCase(), title, updated_at: new Date().toISOString() }).select();
    if (error) { console.error('[DentistSettings] Supabase update error:', error); return res.status(500).json({ error: 'Failed to update dentist records.' }); }

    return res.status(200).json({ message: 'Dentist settings updated successfully.', data: data?.[0] || null });
  } catch (error) { next(error); }
});

// =========================================================
// ERROR HANDLING & EXPORT
// =========================================================
router.use((error, req, res, next) => {
  console.error('[Settings API Error]', error);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = router;