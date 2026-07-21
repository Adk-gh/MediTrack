# medical\_records table

\
create table public.medical\_records (
id uuid not null default gen\_random\_uuid (),
user\_id uuid null,
university\_id character varying(50) null,
last\_name character varying(100) null,
first\_name character varying(100) null,
middle\_name character varying(50) null,
sex character varying(20) null,
birthday date null,
age integer null,
address text null,
contact\_no character varying(20) null,
religion character varying(100) null,
nationality character varying(100) null,
civil\_status character varying(50) null,
emergency\_name character varying(100) null,
emergency\_relation character varying(50) null,
emergency\_address text null,
emergency\_contact character varying(20) null,
vax1 character varying(50) null,
vax1\_date date null,
vax1\_remarks text null,
vax2 character varying(50) null,
vax2\_date date null,
vax2\_remarks text null,
booster1 character varying(50) null,
booster1\_date date null,
booster1\_remarks text null,
booster2 character varying(50) null,
booster2\_date date null,
booster2\_remarks text null,
covid\_history text null,
other\_medical\_history text null,
other\_family\_history text null,
smoking character varying(10) null,
smoking\_details text null,
alcohol character varying(10) null,
alcohol\_details text null,
drugs character varying(10) null,
drugs\_details text null,
questionnaire jsonb null default '{}'::jsonb,
height character varying(20) null,
weight character varying(20) null,
bmi character varying(20) null,
waist character varying(20) null,
lmp character varying(20) null,
lab\_cbc character varying(50) null,
lab\_cbc\_facility character varying(100) null,
lab\_cbc\_date date null,
lab\_ua character varying(50) null,
lab\_ua\_facility character varying(100) null,
lab\_ua\_date date null,
lab\_xray character varying(50) null,
lab\_xray\_facility character varying(100) null,
lab\_xray\_date date null,
physician character varying(100) null,
exam\_date timestamp with time zone null,
nurse\_on\_duty character varying(100) null,
checked\_medical jsonb null default '\[]'::jsonb,
checked\_family jsonb null default '\[]'::jsonb,
checked\_health jsonb null default '\[]'::jsonb,
vital\_records jsonb null default '\[]'::jsonb,
status character varying(20) null default 'pending'::character varying,
is\_approved boolean null default false,
student\_signature character varying(255) null,
date\_signed date null,
created\_at timestamp with time zone null default now(),
updated\_at timestamp with time zone null default now(),
approved\_at timestamp with time zone null,
finding1 text null,
remarks text null,
is\_fit boolean null default true,
is\_normal\_findings boolean null default true,
school\_year character varying(50) not null default ''::character varying,
is\_archived boolean null default false,
deleted\_by text null,
issue\_cert boolean null default false,
constraint medical\_records\_pkey primary key (id),
constraint medical\_records\_user\_id\_fkey foreign KEY (user\_id) references users (id) on delete CASCADE
) TABLESPACE pg\_default;

create index IF not exists idx\_medical\_records\_status on public.medical\_records using btree (status) TABLESPACE pg\_default;

create index IF not exists idx\_medical\_records\_university\_id on public.medical\_records using btree (university\_id) TABLESPACE pg\_default;

create index IF not exists idx\_medical\_records\_user on public.medical\_records using btree (user\_id) TABLESPACE pg\_default;

create index IF not exists idx\_medical\_records\_is\_archived on public.medical\_records using btree (is\_archived) TABLESPACE pg\_default;

create index IF not exists idx\_medical\_records\_school\_year on public.medical\_records using btree (school\_year) TABLESPACE pg\_default;

***

# **users table**

create table public.users (
id uuid not null default gen\_random\_uuid (),
uid character varying(128) null,
email character varying(255) not null,
first\_name character varying(100) not null,
middle\_name character varying(100) null,
last\_name character varying(100) not null,
suffix character varying(20) null,
university\_id character varying(50) null,
role character varying(50) null default 'student'::character varying,
is\_verified boolean null default false,
is\_profile\_setup boolean null default false,
profile\_complete boolean null default false,
birthday date null,
age integer null,
sex character varying(20) null,
blood\_type character varying(10) null,
home\_address text null,
religion character varying(100) null,
nationality character varying(100) null,
civil\_status character varying(50) null,
department character varying(100) null,
program character varying(100) null,
year\_level character varying(20) null,
section character varying(20) null,
student\_classification character varying(50) null,
classification character varying(100) null,
job\_title character varying(100) null,
phone\_number character varying(20) null,
emergency\_contact jsonb null default '{}'::jsonb,
vaccinations jsonb null default '{"dose1": {}, "dose2": {}, "booster1": {}, "booster2": {}}'::jsonb,
created\_at timestamp with time zone null default now(),
updated\_at timestamp with time zone null default now(),
dental\_history jsonb null default '{}'::jsonb,
is\_archived boolean null default false,
deleted\_by text null,
license\_number text null,
constraint users\_pkey primary key (id),
constraint users\_email\_key unique (email),
constraint users\_uid\_key unique (uid),
constraint users\_university\_id\_key unique (university\_id)
) TABLESPACE pg\_default;

create index IF not exists idx\_users\_is\_archived on public.users using btree (is\_archived) TABLESPACE pg\_default;

***

i want to reduce the number of columns medical\_records have. instead of saving the users info into the medical records like each column. can it be saved as a jsonb instead i want to save the sex, birthday, age, address, contact\_no, religion, nationality, civil\_status, emergency\_name, emergency\_relation, emergency\_address, emergency\_contact, \[vax1, vax1\_date, vax1\_remarks, vax2, vax2\_date, vax2\_remarks, booster1, booster1\_date, booster1\_remarks, booster2, booster2\_date, booster2\_remarks(merge those columns (vax1 to booster2\_remarks) into one "Covid history")], covid\_history
