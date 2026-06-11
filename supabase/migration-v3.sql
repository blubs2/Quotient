-- v3 migration: the attempts table originally restricted "cat" to four
-- values. The new subtests add more, so drop the constraint.
-- Run this once in Supabase -> SQL Editor -> New query -> Run.
alter table public.attempts drop constraint if exists attempts_cat_check;
