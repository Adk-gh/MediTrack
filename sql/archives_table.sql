create table public.archives (
  id uuid not null default gen_random_uuid (),
  type character varying(50) not null,
  original_id uuid not null,
  data jsonb not null,
  deleted_by character varying(255) null,
  archived_at timestamp with time zone null default now(),
  permanent_delete_at timestamp with time zone not null,
  is_permanently_deleted boolean null default false,
  restored_at timestamp with time zone null,
  constraint archives_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_archives_type on public.archives using btree (type) TABLESPACE pg_default;

create index IF not exists idx_archives_archived_at on public.archives using btree (archived_at) TABLESPACE pg_default;

create index IF not exists idx_archives_permanent_delete_at on public.archives using btree (permanent_delete_at) TABLESPACE pg_default;

create index IF not exists idx_archives_is_permanently_deleted on public.archives using btree (is_permanently_deleted) TABLESPACE pg_default;