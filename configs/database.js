require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Missing Supabase configuration: SUPABASE_URL or SUPABASE_SERVICE_KEY'
  );
  process.exit(1);
}

// Explicitly disable session management for the server environment
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

console.log('📂 Supabase client initialized...');

module.exports = supabase;