-- Add is_archived, deleted_by, and updated_at columns to all relevant tables
-- Run this in your Supabase SQL Editor

-- Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Consultations table
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Medical records table
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Dental records table
ALTER TABLE dental_records ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE dental_records ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE dental_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_archived ON users(is_archived);
CREATE INDEX IF NOT EXISTS idx_announcements_is_archived ON announcements(is_archived);
CREATE INDEX IF NOT EXISTS idx_appointments_is_archived ON appointments(is_archived);
CREATE INDEX IF NOT EXISTS idx_consultations_is_archived ON consultations(is_archived);
CREATE INDEX IF NOT EXISTS idx_medical_records_is_archived ON medical_records(is_archived);
CREATE INDEX IF NOT EXISTS idx_dental_records_is_archived ON dental_records(is_archived);