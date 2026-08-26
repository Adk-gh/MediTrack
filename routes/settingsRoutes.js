// C:\Users\HP\MediTrack\routes\settingsRoutes.js

const express = require('express');
const multer = require('multer');
const supabase = require('../configs/database');
const { authorized } = require('../middleware/authorized');
const { getSystemConfig } = require('../services/systemConfig.service');

const router = express.Router();

// =========================================================
// CONFIGURATION & MULTER
// =========================================================
const STORAGE_BUCKET = 'MediStorage';
const SIGNED_URL_EXPIRES_IN = 60 * 60; // 1 hour

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  }
});

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
// STORAGE HELPERS
// =========================================================
const createSignedUrl = async (storagePath) => {
  if (!storagePath) return '';
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, SIGNED_URL_EXPIRES_IN);
  if (error) { console.error('[SettingsStorage] Failed to create signed URL:', error); return ''; }
  return data?.signedUrl || '';
};

const deleteStorageFile = async (storagePath) => {
  if (!storagePath) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  if (error) console.warn('[SettingsStorage] Failed to delete old signature:', { storagePath, error });
  else console.log('[SettingsStorage] Old signature deleted:', storagePath);
};

const getSafeExtension = (file) => {
  const ext = (file?.originalname || '').split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return ext;
  return { 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file?.mimetype] || 'png';
};

const uploadSignatureFile = async ({ file, folder, prefix }) => {
  const storagePath = `${folder}/${prefix}-1-${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${getSafeExtension(file)}`;
  console.log('[SettingsStorage] Uploading:', storagePath);

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) { console.error('[SettingsStorage] Upload failed:', error); throw error; }

  console.log('[SettingsStorage] Upload successful:', storagePath);
  return storagePath;
};

// =========================================================
// DOCTOR SETTINGS
// =========================================================
router.get('/doctor', authorized, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('doctor_settings').select('name, title, licenseNo, ptrNo, signatureUrl').eq('id', 1).maybeSingle();

    if (error || !data) {
      if (error) console.warn('[DoctorSettings] Could not retrieve settings:', error);
      return res.status(200).json({ name: 'CAREN NAVATA JOSE M.D.', title: 'Medical Officer III', licenseNo: '0114665', ptrNo: '9978569', signatureUrl: '' });
    }
    return res.status(200).json({ name: data.name || '', title: data.title || '', licenseNo: data.licenseNo || '', ptrNo: data.ptrNo || '', signatureUrl: data.signatureUrl ? await createSignedUrl(data.signatureUrl) : '' });
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

router.post('/doctor/signature', authorized, allowDynamicClinicStaffs, upload.single('signature'), async (req, res, next) => {
  try {
    console.log('\n[DoctorSignature] New upload request\nOriginal name:', req.file?.originalname, '| MIME type:', req.file?.mimetype, '| Size:', req.file?.size);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const { data: existing, error: fetchError } = await supabase.from('doctor_settings').select('id, signatureUrl').eq('id', 1).maybeSingle();
    if (fetchError) { console.error('[DoctorSignature] Fetch existing error:', fetchError); return res.status(500).json({ error: 'Failed to check existing doctor settings.' }); }

    const newStoragePath = await uploadSignatureFile({ file: req.file, folder: 'doctor/signatures', prefix: 'doctor' });

    const dbData = { name: 'CAREN NAVATA JOSE M.D.', title: 'Medical Officer III', licenseNo: '0114665', ptrNo: '9978569', signatureUrl: newStoragePath, updated_at: new Date().toISOString() };
    const dbQuery = existing ? supabase.from('doctor_settings').update({ signatureUrl: newStoragePath, updated_at: new Date().toISOString() }).eq('id', 1).select() : supabase.from('doctor_settings').insert({ id: 1, ...dbData }).select();
    const { data: dbResultData, error: dbError } = await dbQuery;

    if (dbError) {
      console.error('[DoctorSignature] Save path error:', dbError);
      await deleteStorageFile(newStoragePath);
      return res.status(500).json({ error: 'Failed to save signature.' });
    }

    if (existing?.signatureUrl && existing.signatureUrl !== newStoragePath) await deleteStorageFile(existing.signatureUrl);
    console.log('[DoctorSignature] Signature saved successfully. Path:', newStoragePath, '\n');

    return res.status(200).json({ message: 'Signature uploaded successfully.', signatureUrl: await createSignedUrl(newStoragePath), data: dbResultData?.[0] || null });
  } catch (error) { console.error('[DoctorSignature] Upload error:', error); next(error); }
});

// =========================================================
// DENTIST SETTINGS
// =========================================================
router.get('/dentist', authorized, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('dentist_settings').select('name, title, signatureUrl').eq('id', 1).maybeSingle();
    if (error || !data) {
      if (error) console.warn('[DentistSettings] Could not retrieve settings:', error);
      return res.status(200).json({ name: 'DR. JOSELITO S. REYES', title: 'DENTIST II', signatureUrl: '' });
    }
    return res.status(200).json({ name: data.name || '', title: data.title || '', signatureUrl: data.signatureUrl ? await createSignedUrl(data.signatureUrl) : '' });
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

router.post('/dentist/signature', authorized, allowDynamicClinicStaffs, upload.single('signature'), async (req, res, next) => {
  try {
    console.log('\n[DentistSignature] New upload request\nOriginal name:', req.file?.originalname, '| MIME type:', req.file?.mimetype, '| Size:', req.file?.size);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const { data: existing, error: fetchError } = await supabase.from('dentist_settings').select('id, signatureUrl').eq('id', 1).maybeSingle();
    if (fetchError) { console.error('[DentistSignature] Fetch existing error:', fetchError); return res.status(500).json({ error: 'Failed to check existing dentist settings.' }); }

    const newStoragePath = await uploadSignatureFile({ file: req.file, folder: 'dentist/signatures', prefix: 'dentist' });

    const dbData = { name: 'DR. JOSELITO S. REYES', title: 'DENTIST II', signatureUrl: newStoragePath, updated_at: new Date().toISOString() };
    const dbQuery = existing ? supabase.from('dentist_settings').update({ signatureUrl: newStoragePath, updated_at: new Date().toISOString() }).eq('id', 1).select() : supabase.from('dentist_settings').insert({ id: 1, ...dbData }).select();
    const { data: dbResultData, error: dbError } = await dbQuery;

    if (dbError) {
      console.error('[DentistSignature] Save path error:', dbError);
      await deleteStorageFile(newStoragePath);
      return res.status(500).json({ error: 'Failed to save signature.' });
    }

    if (existing?.signatureUrl && existing.signatureUrl !== newStoragePath) await deleteStorageFile(existing.signatureUrl);
    console.log('[DentistSignature] Signature saved successfully. Path:', newStoragePath, '\n');

    return res.status(200).json({ message: 'Signature uploaded successfully.', signatureUrl: await createSignedUrl(newStoragePath), data: dbResultData?.[0] || null });
  } catch (error) { console.error('[DentistSignature] Upload error:', error); next(error); }
});

// =========================================================
// ERROR HANDLING & EXPORT
// =========================================================
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Image must be under 2MB.' });
    return res.status(400).json({ error: error.message });
  }
  if (error?.message === 'Only image files are allowed') return res.status(400).json({ error: error.message });
  next(error);
});

module.exports = router;