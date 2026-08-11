// C:\Users\HP\MediTrack\routes\settingsRoutes.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();

// 1. Find the keys, checking all common environment variable names
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

// 2. Safely initialize the client to prevent server crashes on boot
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.error('\n⚠️ [Settings Route] SUPABASE CONFIG ERROR: Missing URL or Key in .env file. Settings will not save.\n');
}


// ==========================================
// DOCTOR SETTINGS ROUTES
// ==========================================

// GET: Retrieve doctor settings
router.get('/doctor', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured properly.' });
    }

    const { data, error } = await supabase
      .from('doctor_settings')
      .select('name, title, licenseNo, ptrNo')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Supabase fetch error:', error);
      return res.status(404).json({ error: 'Doctor settings not found' });
    }

    res.status(200).json(data);
  } catch (error) {
    // Pass to your global-err middleware
    next(error);
  }
});

// PUT: Update doctor settings
router.put('/doctor', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured properly.' });
    }

    const { name, title, licenseNo, ptrNo } = req.body;

    if (!name || !title || !licenseNo || !ptrNo) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const { data, error } = await supabase
      .from('doctor_settings')
      .upsert({
        id: 1,
        name: name.toUpperCase(), // Backend enforcement of all-caps
        title,
        licenseNo,
        ptrNo,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to update database records' });
    }

    res.status(200).json({
      message: 'Settings updated successfully',
      data: data[0]
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
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured properly.' });
    }

    const { data, error } = await supabase
      .from('dentist_settings')
      .select('name, title')
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

// PUT: Update dentist settings
router.put('/dentist', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not configured properly.' });
    }

    const { name, title } = req.body;

    if (!name || !title) {
      return res.status(400).json({ error: 'Name and title are required.' });
    }

    const { data, error } = await supabase
      .from('dentist_settings')
      .upsert({
        id: 1,
        name: name.toUpperCase(), // Backend enforcement of all-caps
        title,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to update database records' });
    }

    res.status(200).json({
      message: 'Dentist settings updated successfully',
      data: data[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;