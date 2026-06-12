create table public.consultations (
  id uuid not null default gen_random_uuid (),
  consultation_type character varying(20) not null,
  created_by uuid null,
  patient_id uuid null,
  patient_name character varying(100) null,
  status character varying(20) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  ended_at timestamp with time zone null,
  constraint consultations_pkey primary key (id),
  constraint consultations_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint consultations_patient_id_fkey foreign KEY (patient_id) references users (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_consultations_status on public.consultations using btree (status) TABLESPACE pg_default;

create index IF not exists idx_consultations_type on public.consultations using btree (consultation_type) TABLESPACE pg_default;

create index IF not exists idx_consultations_patient on public.consultations using btree (patient_id) TABLESPACE pg_default;