const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.supabaseUrl;
const supabaseserviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseserviceKey) {
  console.error('Missing Supabase configuration: SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseserviceKey);

module.exports = supabase;