-- Allow grades above 6 (no upper limit, still at least 0).
-- Run once on the live database. schema.sql already has the new check for fresh setups.
alter table public.grades drop constraint if exists grades_value_check;
alter table public.grades add constraint grades_value_check check (value >= 0);
