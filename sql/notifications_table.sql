create table public.notifications (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  type character varying(50) null,
  title character varying(255) not null,
  message text null,
  reference_id uuid null,
  reference_type character varying(50) null,
  is_read boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint notifications_pkey primary key (id),
  constraint notifications_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_notifications_user on public.notifications using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_notifications_unread on public.notifications using btree (user_id) TABLESPACE pg_default
where
  (is_read = false);