create table public.announcements (
  id uuid not null default gen_random_uuid (),
  title character varying(255) not null,
  content text null,
  image_url text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_archived boolean null default false,
  deleted_by text null,
  category character varying(100) null default 'General'::character varying,
  priority character varying(20) null default 'normal'::character varying,
  dept text null default 'All Departments'::character varying,
  location character varying(255) null,
  contact_person character varying(100) null,
  contact_email character varying(255) null,
  date date null,
  constraint announcements_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_announcements_dept on public.announcements using btree (dept) TABLESPACE pg_default;

create index IF not exists idx_announcements_is_archived on public.announcements using btree (is_archived) TABLESPACE pg_default;

create index IF not exists idx_announcements_category on public.announcements using btree (category) TABLESPACE pg_default;

create index IF not exists idx_announcements_priority on public.announcements using btree (priority) TABLESPACE pg_default;