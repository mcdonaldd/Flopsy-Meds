-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query).
-- After running, go to Authentication → Providers → Email and turn off "Confirm email"
-- so you can log in immediately without an inbox step.

create table if not exists meds (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references auth.users not null,
  name         text        not null,
  dose         text        not null default '',
  timing       text        not null default '',
  instructions text        not null default '',
  short_term   boolean     not null default false,
  end_date     text,
  color        text        not null default 'coral',
  active          boolean     not null default true,
  sort_order      integer     not null default 0,
  scheduled_time  text,
  created_at      timestamptz default now()
);

alter table meds enable row level security;

create policy "Users manage their own meds" on meds
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists dose_log (
  user_id  uuid    references auth.users not null,
  day      text    not null,
  med_id   uuid    references meds on delete cascade not null,
  given    boolean not null default false,
  given_at text,
  note     text    not null default '',
  primary key (user_id, day, med_id)
);

alter table dose_log enable row level security;

create policy "Users manage their own dose log" on dose_log
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
