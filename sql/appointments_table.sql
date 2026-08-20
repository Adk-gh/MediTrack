create table public.appointments (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  patient_name character varying(100) null,
  day integer null,
  month integer null,
  year integer null,
  time character varying(20) null,
  service_type character varying(100) null,
  reason text null,
  status character varying(20) null default 'Pending'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_archived boolean null default false,
  deleted_by text null,
  batch_id uuid null,
  booked_by text null,
  booked_by_id uuid null,
  constraint appointments_pkey primary key (id),
  constraint appointments_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_appointments_date on public.appointments using btree (year, month, day) TABLESPACE pg_default;

create index IF not exists idx_appointments_user on public.appointments using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_appointments_is_archived on public.appointments using btree (is_archived) TABLESPACE pg_default;