create table public.ocr_settings (
  id text not null default 'default'::text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint ocr_settings_pkey primary key (id)
) TABLESPACE pg_default;