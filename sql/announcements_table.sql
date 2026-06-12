create table public.announcements (
  id uuid not null default gen_random_uuid (),
  title character varying(255) not null,
  content text null,
  image_url text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint announcements_pkey primary key (id)
) TABLESPACE pg_default;