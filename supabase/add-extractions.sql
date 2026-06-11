-- Run in Supabase SQL Editor to add extraction history support.

CREATE TABLE IF NOT EXISTS extractions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references auth.users not null,
  filename     text        not null,
  extracted_at timestamptz default now(),
  output       jsonb       not null default '[]'
);

alter table extractions enable row level security;

create policy "Users manage their own extractions" on extractions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table meds
  add column if not exists extraction_id uuid references extractions(id) on delete set null;
