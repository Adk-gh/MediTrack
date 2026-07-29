-- OCR Settings Table
-- Stores OCR configuration (keywords, role mappings) in Supabase

CREATE TABLE IF NOT EXISTS ocr_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config if not exists
INSERT INTO ocr_settings (id, config)
VALUES ('default', '{
  "institution_keywords": ["PAMANTASAN", "UNIVERSITY", "COLLEGE"],
  "role_mappings": [
    {"name": "Doctor", "id_type": "Employee ID", "keywords": ["DOCTOR", "PHYSICIAN", "MEDICAL DOCTOR", "MD"]},
    {"name": "Dentist", "id_type": "Employee ID", "keywords": ["DENTIST", "DENTAL"]},
    {"name": "Nurse", "id_type": "Employee ID", "keywords": ["NURSE"]},
    {"name": "Lecturer", "id_type": "Employee ID", "keywords": ["LECTURER"]},
    {"name": "Professor", "id_type": "Employee ID", "keywords": ["PROFESSOR", "PROF"]},
    {"name": "Instructor", "id_type": "Employee ID", "keywords": ["INSTRUCTOR"]},
    {"name": "Administrator", "id_type": "Employee ID", "keywords": ["ADMINISTRATOR", "ADMIN"]},
    {"name": "Librarian", "id_type": "Employee ID", "keywords": ["LIBRARIAN"]},
    {"name": "Technician", "id_type": "Employee ID", "keywords": ["TECHNICIAN", "TECH"]},
    {"name": "Guard", "id_type": "Employee ID", "keywords": ["GUARD", "SECURITY"]},
    {"name": "Staff", "id_type": "Employee ID", "keywords": ["STAFF", "EMPLOYEE", "FACULTY", "JANITOR", "CLEANER", "MAINTENANCE"]},
    {"name": "Student", "id_type": "Student ID", "keywords": ["BSIT", "BSIS", "BSBA", "BSED", "BSCS", "BSCRIM", "BSHM", "BSENT", "BSOA", "COURSE", "ENROLLMENT", "YEAR LEVEL", "STUDENT"]}
  ]
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS (optional - can be disabled for service access)
ALTER TABLE ocr_settings ENABLE ROW LEVEL SECURITY;

-- Allow full access to service role (or disable RLS)
CREATE POLICY "Allow full access to ocr_settings" ON ocr_settings
    FOR ALL USING (true) WITH CHECK (true);
