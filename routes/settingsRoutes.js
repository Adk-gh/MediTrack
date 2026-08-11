// C:\Users\HP\MediTrack\routes\settingsRoutes.js
const express = require('express');
const multer = require('multer');
const supabase = require('../configs/database');

const router = express.Router();

// Multer memory storage for signature uploads (2MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// ==========================================
// DOCTOR SETTINGS ROUTES
// ==========================================

// GET: Retrieve doctor settings
router.get('/doctor', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('doctor_settings')
      .select('name, title, licenseNo, ptrNo, signatureUrl')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Supabase fetch error:', error);
      return res.status(404).json({ error: 'Doctor settings not found' });
    }

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

// PUT: Update doctor text fields
router.put('/doctor', async (req, res, next) => {
  try {
    const { name, title, licenseNo, ptrNo } = req.body;

    if (!name || !title || !licenseNo || !ptrNo) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const { data, error } = await supabase
      .from('doctor_settings')
      .upsert({
        id: 1,
        name: name.toUpperCase(),
        title,
        licenseNo,
        ptrNo,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to update doctor records' });
    }

    res.status(200).json({
      message: 'Doctor settings updated successfully',
      data: data[0]
    });
  } catch (error) {
    next(error);
  }
});

// POST: Upload / update doctor signature image
router.post('/doctor/signature', upload.single('signature'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const ext = (req.file.originalname.split('.').pop() || 'png').toLowerCase();
    const fileName = `signatures/doctor-1-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('MediStorage')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload signature image' });
    }

    const { data: publicUrlData } = supabase.storage
      .from('MediStorage')
      .getPublicUrl(fileName);

    const signatureUrl = publicUrlData.publicUrl;

    const { data: existing, error: fetchError } = await supabase
      .from('doctor_settings')
      .select('id')
      .eq('id', 1)
      .maybeSingle();

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError);
      return res.status(500).json({ error: 'Failed to check existing doctor settings' });
    }

    let dbResult;
    if (existing) {
      dbResult = await supabase
        .from('doctor_settings')
        .update({
          signatureUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
        .select();
    } else {
      dbResult = await supabase
        .from('doctor_settings')
        .insert({
          id: 1,
          name: 'CAREN NAVATA JOSE M.D.',
          title: 'Medical Officer III',
          licenseNo: '0114665',
          ptrNo: '9978569',
          signatureUrl,
          updated_at: new Date().toISOString()
        })
        .select();
    }

    if (dbResult.error) {
      console.error('Supabase update error:', dbResult.error);
      return res.status(500).json({ error: 'Failed to save signature URL' });
    }

    res.status(200).json({
      message: 'Signature uploaded successfully',
      signatureUrl,
      data: dbResult.data[0]
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DENTIST SETTINGS ROUTES
// ==========================================

// GET: Retrieve dentist settings
router.get('/dentist', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('dentist_settings')
      .select('name, title, signatureUrl')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Supabase fetch error:', error);
      return res.status(404).json({ error: 'Dentist settings not found' });
    }

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

// PUT: Update dentist text fields
router.put('/dentist', async (req, res, next) => {
  try {
    const { name, title } = req.body;

    if (!name || !title) {
      return res.status(400).json({ error: 'Name and title are required.' });
    }

    const { data, error } = await supabase
      .from('dentist_settings')
      .upsert({
        id: 1,
        name: name.toUpperCase(),
        title,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to update dentist records' });
    }

    res.status(200).json({
      message: 'Dentist settings updated successfully',
      data: data[0]
    });
  } catch (error) {
    next(error);
  }
});

// POST: Upload / update dentist signature image
router.post('/dentist/signature', upload.single('signature'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const ext = (req.file.originalname.split('.').pop() || 'png').toLowerCase();
    const fileName = `signatures/dentist-1-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('MediStorage')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload signature image' });
    }

    const { data: publicUrlData } = supabase.storage
      .from('MediStorage')
      .getPublicUrl(fileName);

    const signatureUrl = publicUrlData.publicUrl;

    const { data: existing, error: fetchError } = await supabase
      .from('dentist_settings')
      .select('id')
      .eq('id', 1)
      .maybeSingle();

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError);
      return res.status(500).json({ error: 'Failed to check existing dentist settings' });
    }

    let dbResult;
    if (existing) {
      dbResult = await supabase
        .from('dentist_settings')
        .update({
          signatureUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
        .select();
    } else {
      dbResult = await supabase
        .from('dentist_settings')
        .insert({
          id: 1,
          name: 'DR. JOSELITO S. REYES',
          title: 'DENTIST II',
          signatureUrl,
          updated_at: new Date().toISOString()
        })
        .select();
    }

    if (dbResult.error) {
      console.error('Supabase update error:', dbResult.error);
      return res.status(500).json({ error: 'Failed to save signature URL' });
    }

    res.status(200).json({
      message: 'Signature uploaded successfully',
      signatureUrl,
      data: dbResult.data[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;