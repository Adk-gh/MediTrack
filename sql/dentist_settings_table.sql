create table public.dentist_settings (
  id integer not null,
  name text not null,
  title text not null,
  updated_at timestamp with time zone null default now(),
  "signatureUrl" text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint dentist_settings_pkey primary key (id)
) TABLESPACE pg_default;

create trigger force_uppercase_dentist_name BEFORE INSERT
or
update on dentist_settings for EACH row
execute FUNCTION uppercase_dentist_name ();