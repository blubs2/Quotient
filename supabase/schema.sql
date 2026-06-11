-- QUOTIENT database schema
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

-- 1. SRS state: one row per (user, word), storing the full FSRS card as JSON.
create table if not exists public.srs_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null,
  card jsonb not null,
  due timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, word)
);

-- 2. Attempts: every answered question. This table IS the dataset for your study —
--    category, correctness, response time, timestamp.
create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  cat text not null check (cat in ('matrices','series','analogies','vocab')),
  correct boolean not null,
  ms integer,
  created_at timestamptz not null default now()
);
create index if not exists attempts_user_idx on public.attempts (user_id, created_at);

-- 3. Daily challenge results: one row per (user, day).
create table if not exists public.daily_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_number integer not null,
  results boolean[] not null,
  created_at timestamptz not null default now(),
  primary key (user_id, daily_number)
);

-- Row Level Security: every user can only touch their own rows.
alter table public.srs_state enable row level security;
alter table public.attempts enable row level security;
alter table public.daily_results enable row level security;

create policy "own srs" on public.srs_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own attempts" on public.attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own daily" on public.daily_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
