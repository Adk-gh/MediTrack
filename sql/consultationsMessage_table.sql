create table public.consultation_messages (
  id uuid not null default gen_random_uuid (),
  consultation_id uuid null,
  sender_id uuid null,
  sender_name character varying(100) null,
  sender_role character varying(50) null,
  message text not null,
  created_at timestamp with time zone null default now(),
  constraint consultation_messages_pkey primary key (id),
  constraint consultation_messages_consultation_id_fkey foreign KEY (consultation_id) references consultations (id) on delete CASCADE,
  constraint consultation_messages_sender_id_fkey foreign KEY (sender_id) references users (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_messages_consultation on public.consultation_messages using btree (consultation_id) TABLESPACE pg_default;