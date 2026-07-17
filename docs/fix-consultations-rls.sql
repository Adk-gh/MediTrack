-- Fix consultations RLS policies

-- Drop and recreate the function to include sysadmin
CREATE OR REPLACE FUNCTION check_is_clinical_staff(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE uid = user_id
    AND role::text = ANY (ARRAY['sysadmin', 'admin', 'doctor', 'nurse', 'dentist'])
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the "Enable read access for admin users" policy on consultations
-- (if it exists, otherwise it might be using the function already)
DROP POLICY IF EXISTS "Enable read access for admin users" ON public.consultations;

CREATE POLICY "Enable read access for sysadmin" ON public.consultations
FOR SELECT
USING (
  check_is_clinical_staff(auth.uid())
  OR patient_id = (
    SELECT id FROM users WHERE uid = auth.uid()
  )
);

-- Also update staff can view policy
DROP POLICY IF EXISTS "Staff can view consultations" ON public.consultations;
CREATE POLICY "Staff can view consultations" ON public.consultations
FOR SELECT
USING (check_is_clinical_staff(auth.uid()));

SELECT 'Consultations RLS fixed!' as result;