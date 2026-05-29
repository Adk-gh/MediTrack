// C:\Users\HP\MediTrack\frontend\src\supabase.js
import { createClient } from '@supabase/supabase-js';

// Vite handles loading environment variables automatically via import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // 👈 Changed to public ANON key

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Frontend Supabase configuration keys!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const db = supabase; // For compatibility with existing code
export const auth = supabase.auth;