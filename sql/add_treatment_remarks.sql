-- Add treatment_remarks and treatments columns to dental_records table
ALTER TABLE public.dental_records
ADD COLUMN IF NOT EXISTS treatment_remarks jsonb null default '{}'::jsonb;

ALTER TABLE public.dental_records
ADD COLUMN IF NOT EXISTS treatments jsonb null default '{}'::jsonb;