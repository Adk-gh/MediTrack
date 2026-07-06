-- Fix RLS policy for archives table
-- Run this in your Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can manage archives" ON archives;

-- Create a simpler policy that allows authenticated users to insert/update/delete
-- This allows any logged-in user to archive items (admins are the only ones using the delete function anyway)
CREATE POLICY "Authenticated users can manage archives" ON archives
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- If you want to be more restrictive and only allow actual admins, use this instead:
-- CREATE POLICY "Admins can manage archives" ON archives
--   FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE users.uid = auth.uid()
--       AND LOWER(users.role) IN ('admin', 'administrator')
--     )
--   );