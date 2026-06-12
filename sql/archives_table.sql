-- SQL to create the archives table in Supabase
-- Run this in your Supabase SQL Editor

-- Create archives table
CREATE TABLE IF NOT EXISTS archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  original_id UUID NOT NULL,
  data JSONB NOT NULL,
  deleted_by VARCHAR(255),
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  permanent_delete_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_permanently_deleted BOOLEAN DEFAULT FALSE,
  restored_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_archives_type ON archives(type);
CREATE INDEX IF NOT EXISTS idx_archives_archived_at ON archives(archived_at);
CREATE INDEX IF NOT EXISTS idx_archives_permanent_delete_at ON archives(permanent_delete_at);
CREATE INDEX IF NOT EXISTS idx_archives_is_permanently_deleted ON archives(is_permanently_deleted);

-- Enable RLS
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;

-- Create policy for admin-only access
CREATE POLICY "Admins can manage archives" ON archives
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND LOWER(users.role) IN ('admin', 'administrator')
    )
  );