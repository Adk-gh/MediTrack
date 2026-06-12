create table public.audit_logs (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  "userId" text null,
  "userEmail" text null,
  "userName" text null,
  action text not null,
  type text not null,
  description text null,
  details jsonb null,
  constraint audit_logs_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_audit_logs_created_at on public.audit_logs using btree (created_at desc) TABLESPACE pg_default;