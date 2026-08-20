create table public.medical_records (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  university_id character varying(50) null,
  last_name character varying(100) null,
  first_name character varying(100) null,
  middle_name character varying(50) null,
  other_medical_history text null,
  other_family_history text null,
  smoking character varying(10) null,
  smoking_details text null,
  alcohol character varying(10) null,
  alcohol_details text null,
  drugs character varying(10) null,
  drugs_details text null,
  questionnaire jsonb null default '{}'::jsonb,
  physician character varying(100) null,
  exam_date timestamp with time zone null,
  nurse_on_duty character varying(100) null,
  checked_medical jsonb null default '[]'::jsonb,
  checked_family jsonb null default '[]'::jsonb,
  checked_health jsonb null default '[]'::jsonb,
  vital_records jsonb null default '[]'::jsonb,
  status character varying(20) null default 'pending'::character varying,
  is_approved boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  approved_at timestamp with time zone null,
  finding1 text null,
  remarks text null,
  is_fit boolean null default true,
  is_normal_findings boolean null default true,
  school_year character varying(50) not null default ''::character varying,
  is_archived boolean null default false,
  deleted_by text null,
  issue_cert boolean null default false,
  patient_info jsonb null default '{}'::jsonb,
  laboratory_results jsonb null default '{}'::jsonb,
  covid_history jsonb null default '{}'::jsonb,
  surgical_history jsonb null default '[]'::jsonb,
  semester character varying(50) null,
  cert_requested boolean null default false,
  cert_requested_at timestamp with time zone null,
  constraint medical_records_pkey primary key (id),
  constraint medical_records_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_medical_records_status on public.medical_records using btree (status) TABLESPACE pg_default;

create index IF not exists idx_medical_records_university_id on public.medical_records using btree (university_id) TABLESPACE pg_default;

create index IF not exists idx_medical_records_user on public.medical_records using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_medical_records_is_archived on public.medical_records using btree (is_archived) TABLESPACE pg_default;

create index IF not exists idx_medical_records_school_year on public.medical_records using btree (school_year) TABLESPACE pg_default;

create trigger trg_normalize_medical_names BEFORE INSERT
or
update on medical_records for EACH row
execute FUNCTION normalize_medical_names ();