create table public.presence (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  status character varying(20) null default 'online'::character varying,
  last_seen timestamp with time zone null default now(),
  constraint presence_pkey primary key (id),
  constraint presence_user_id_key unique (user_id),
  constraint presence_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;