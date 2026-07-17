-- Fix RLS policies to include 'sysadmin' role

-- Medical Records - Clinical staff can view
DROP POLICY IF EXISTS "Clinical staff can view medical records" ON public.medical_records;
CREATE POLICY "Clinical staff can view medical records" ON public.medical_records
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.uid::text = auth.uid()::text
  AND users.role::text = ANY (ARRAY['sysadmin'::text, 'admin'::text, 'doctor'::text, 'nurse'::text, 'dentist'::text])
));

-- Medical Records - Clinical staff can update
DROP POLICY IF EXISTS "Clinical staff can update medical records" ON public.medical_records;
CREATE POLICY "Clinical staff can update medical records" ON public.medical_records
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.uid::text = auth.uid()::text
  AND users.role::text = ANY (ARRAY['sysadmin'::text, 'admin'::text, 'doctor'::text, 'nurse'::text, 'dentist'::text])
));

-- Dental Records - Dental staff can view
DROP POLICY IF EXISTS "Dental staff can view dental records" ON public.dental_records;
CREATE POLICY "Dental staff can view dental records" ON public.dental_records
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.uid::text = auth.uid()::text
  AND users.role::text = ANY (ARRAY['sysadmin'::text, 'admin'::text, 'dentist'::text])
));

-- Dental Records - Dental staff can update
DROP POLICY IF EXISTS "Dental staff can update dental records" ON public.dental_records;
CREATE POLICY "Dental staff can update dental records" ON public.dental_records
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.uid::text = auth.uid()::text
  AND users.role::text = ANY (ARRAY['sysadmin'::text, 'admin'::text, 'dentist'::text])
));

-- Appointments - Staff can view
DROP POLICY IF EXISTS "Staff can view appointments" ON public.appointments;
CREATE POLICY "Staff can view appointments" ON public.appointments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.uid::text = auth.uid()::text
  AND users.role::text = ANY (ARRAY['sysadmin'::text, 'admin'::text, 'doctor'::text, 'nurse'::text, 'dentist'::text])
));

-- Appointments - Staff can update
DROP POLICY IF EXISTS "Staff can update appointments" ON public.appointments;
CREATE POLICY "Staff can update appointments" ON public.appointments
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.uid::text = auth.uid()::text
  AND users.role::text = ANY (ARRAY['sysadmin'::text, 'admin'::text, 'doctor'::text, 'nurse'::text, 'dentist'::text])
));

-- Appointments - Staff can delete
DROP POLICY IF EXISTS "Staff can delete appointments" ON public.appointments;
CREATE POLICY "Staff can delete appointments" ON public.appointments
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.uid::text = auth.uid()::text
  AND users.role::text = ANY (ARRAY['sysadmin'::text, 'admin'::text, 'doctor'::text, 'nurse'::text, 'dentist'::text])
));

-- Also update the users table role from 'admin' to 'sysadmin' (optional - run if you want)
-- UPDATE users SET role = 'sysadmin' WHERE role = 'admin';

SELECT 'RLS policies updated successfully!' as result;