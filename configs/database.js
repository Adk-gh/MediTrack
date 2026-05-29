  // C:\Users\HP\MediTrack\configs/database.js
  require('dotenv').config();
  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.supabaseUrl;
  const supabaserviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaserviceKey) {
    console.error('Missing Supabase configuration: SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaserviceKey);

  console.log('📂 Supabase client initialized...');

  module.exports = supabase;