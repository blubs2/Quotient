-- v4 migration: profiles, assessment history, Elo ratings, leaderboard,
-- calibration metadata. Run ONCE in Supabase -> SQL Editor -> New query.

-- 1. Public display names (for the daily leaderboard)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 3 and 20),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles are public" on public.profiles for select using (true);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "update own profile" on public.profiles for update using (auth.uid() = user_id);

-- 2. Saved assessment runs (powers the Progress charts)
create table if not exists public.assessments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  domains jsonb not null,
  memory jsonb,
  speed jsonb,
  created_at timestamptz not null default now()
);
alter table public.assessments enable row level security;
create policy "own assessments" on public.assessments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Per-domain Elo-style ratings
create table if not exists public.ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null,
  rating integer not null default 1200,
  n integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, domain)
);
alter table public.ratings enable row level security;
create policy "own ratings" on public.ratings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Daily leaderboard: total time + cross-user read access
alter table public.daily_results add column if not exists ms integer;
create policy "leaderboard read" on public.daily_results for select using (true);

-- 5. Calibration: which template generated each attempted question
alter table public.attempts add column if not exists meta jsonb;
