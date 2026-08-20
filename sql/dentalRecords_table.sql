create table public.dental_records (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  university_id character varying(50) null,
  last_name character varying(100) null,
  first_name character varying(100) null,
  middle_name character varying(50) null,
  sex character varying(20) null,
  age integer null,
  birthday date null,
  address text null,
  cellphone character varying(20) null,
  course_year character varying(100) null,
  office_address text null,
  tel_no character varying(20) null,
  nationality character varying(100) null,
  last_visit date null,
  prev_dentist character varying(100) null,
  physician character varying(100) null,
  vax1_date date null,
  vax2_date date null,
  booster_date date null,
  teeth_upper text null,
  teeth_lower text null,
  tooth_data jsonb null default '{}'::jsonb,
  dental_history jsonb null default '{}'::jsonb,
  intraoral jsonb null default '{}'::jsonb,
  examined_by character varying(100) null,
  exam_date timestamp with time zone null,
  status character varying(20) null default 'pending'::character varying,
  is_approved boolean null default false,
  created_at timestamp with time zone null default now(),
  approved_at timestamp with time zone null default now(),
  is_archived boolean null default false,
  deleted_by text null,
  updated_at timestamp with time zone null,
  treatment_remarks jsonb null default '{}'::jsonb,
  treatments jsonb null default '{}'::jsonb,
  issue_cert boolean null default false,
  school_year character varying(50) null,
  semester character varying(50) null,
  cert_requested boolean null default false,
  cert_requested_at timestamp with time zone null,
  constraint dental_records_pkey primary key (id),
  constraint dental_records_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_dental_records_user on public.dental_records using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_dental_records_status on public.dental_records using btree (status) TABLESPACE pg_default;

create index IF not exists idx_dental_records_university_id on public.dental_records using btree (university_id) TABLESPACE pg_default;

create index IF not exists idx_dental_records_is_archived on public.dental_records using btree (is_archived) TABLESPACE pg_default;

create trigger trg_normalize_dental_names BEFORE INSERT
or
update on dental_records for EACH row
execute FUNCTION normalize_dental_names ();