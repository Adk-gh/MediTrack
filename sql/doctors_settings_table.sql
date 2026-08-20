create table public.doctor_settings (
  id integer not null,
  name character varying(255) not null,
  title character varying(255) not null,
  "licenseNo" character varying(100) not null,
  "ptrNo" character varying(100) not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  "signatureUrl" text null,
  constraint doctor_settings_pkey primary key (id)
) TABLESPACE pg_default;

create trigger force_uppercase_name BEFORE INSERT
or
update on doctor_settings for EACH row
execute FUNCTION uppercase_doctor_name ();