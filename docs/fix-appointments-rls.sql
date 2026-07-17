-- Fix appointments RLS to allow all clinical staff to view

-- Drop existing staff policies
DROP POLICY IF EXISTS "Staff can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "SysAdmin full access appointments" ON public.appointments;

-- Create a function that checks if user is clinical staff
CREATE OR REPLACE FUNCTION is_clinical_staff(user_uid text)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE uid::text = user_uid
    AND role::text = ANY (ARRAY['sysadmin', 'admin', 'doctor', 'nurse', 'dentist'])
    AND role != 'student'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow ALL authenticated users to SELECT appointments (the original policy)
CREATE POLICY "Authenticated users can read all appointments" ON public.appointments
FOR SELECT USING (true);

-- Allow clinical staff to INSERT
CREATE POLICY "Clinical staff can insert appointments" ON public.appointments
FOR INSERT WITH CHECK (is_clinical_staff(auth.uid()::text));

-- Allow clinical staff to UPDATE
CREATE POLICY "Clinical staff can update appointments" ON public.appointments
FOR UPDATE USING (is_clinical_staff(auth.uid()::text));

-- Allow clinical staff to DELETE
CREATE POLICY "Clinical staff can delete appointments" ON public.appointments
FOR DELETE USING (is_clinical_staff(auth.uid()::text));

-- Verify by checking users
SELECT uid, role, is_clinical_staff(uid::text) as can_manage
FROM users
WHERE role IN ('sysadmin', 'admin', 'doctor', 'nurse', 'dentist')
LIMIT 10;