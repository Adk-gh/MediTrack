-- Grant full access to sysadmin role for all tables

-- Update check_is_clinical_staff function to include all operations
CREATE OR REPLACE FUNCTION check_is_clinical_staff(user_auth_uid character varying)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE uid::text = user_auth_uid
    AND role::text = ANY (ARRAY['sysadmin', 'doctor', 'nurse', 'dentist'])
    AND role != 'student'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Medical Records - Full Access for sysadmin
DROP POLICY IF EXISTS "SysAdmin full access medical_records" ON public.medical_records;
CREATE POLICY "SysAdmin full access medical_records" ON public.medical_records
FOR ALL
USING (check_is_clinical_staff(auth.uid()::text))
WITH CHECK (check_is_clinical_staff(auth.uid()::text));

-- Dental Records - Full Access for sysadmin
DROP POLICY IF EXISTS "SysAdmin full access dental_records" ON public.dental_records;
CREATE POLICY "SysAdmin full access dental_records" ON public.dental_records
FOR ALL
USING (check_is_clinical_staff(auth.uid()::text))
WITH CHECK (check_is_clinical_staff(auth.uid()::text));

-- Consultations - Full Access for sysadmin
DROP POLICY IF EXISTS "SysAdmin full access consultations" ON public.consultations;
CREATE POLICY "SysAdmin full access consultations" ON public.consultations
FOR ALL
USING (check_is_clinical_staff(auth.uid()::text))
WITH CHECK (check_is_clinical_staff(auth.uid()::text));

-- Consultation Messages - Full Access for sysadmin
DROP POLICY IF EXISTS "SysAdmin full access consultation_messages" ON public.consultation_messages;
CREATE POLICY "SysAdmin full access consultation_messages" ON public.consultation_messages
FOR ALL
USING (check_is_clinical_staff(auth.uid()::text))
WITH CHECK (check_is_clinical_staff(auth.uid()::text));

-- Appointments - Full Access for sysadmin
DROP POLICY IF EXISTS "SysAdmin full access appointments" ON public.appointments;
CREATE POLICY "SysAdmin full access appointments" ON public.appointments
FOR ALL
USING (check_is_clinical_staff(auth.uid()::text))
WITH CHECK (check_is_clinical_staff(auth.uid()::text));

-- Approvals - Full Access for sysadmin (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approvals') THEN
    EXECUTE 'DROP POLICY IF EXISTS "SysAdmin full access approvals" ON public.approvals';
    EXECUTE 'CREATE POLICY "SysAdmin full access approvals" ON public.approvals FOR ALL USING (check_is_clinical_staff(auth.uid()::text)) WITH CHECK (check_is_clinical_staff(auth.uid()::text))';
  END IF;
END $$;

-- Announcements - Full Access for sysadmin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements') THEN
    EXECUTE 'DROP POLICY IF EXISTS "SysAdmin full access announcements" ON public.announcements';
    EXECUTE 'CREATE POLICY "SysAdmin full access announcements" ON public.announcements FOR ALL USING (check_is_clinical_staff(auth.uid()::text)) WITH CHECK (check_is_clinical_staff(auth.uid()::text))';
  END IF;
END $$;

-- Audit Logs - Full Access for sysadmin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "SysAdmin full access audit_logs" ON public.audit_logs';
    EXECUTE 'CREATE POLICY "SysAdmin full access audit_logs" ON public.audit_logs FOR ALL USING (check_is_clinical_staff(auth.uid()::text)) WITH CHECK (check_is_clinical_staff(auth.uid()::text))';
  END IF;
END $$;

-- Archives - Full Access for sysadmin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'archives') THEN
    EXECUTE 'DROP POLICY IF EXISTS "SysAdmin full access archives" ON public.archives';
    EXECUTE 'CREATE POLICY "SysAdmin full access archives" ON public.archives FOR ALL USING (check_is_clinical_staff(auth.uid()::text)) WITH CHECK (check_is_clinical_staff(auth.uid()::text))';
  END IF;
END $$;

-- Users table - Full Access for sysadmin
DROP POLICY IF EXISTS "SysAdmin full access users" ON public.users;
CREATE POLICY "SysAdmin full access users" ON public.users
FOR ALL
USING (check_is_clinical_staff(auth.uid()::text))
WITH CHECK (check_is_clinical_staff(auth.uid()::text));

SELECT 'Full access granted to sysadmin for all tables!' as result;