-- gradesApp database schema.
-- Run this whole file once in Supabase: SQL Editor > New query > paste > Run.
-- It is safe to read top to bottom: tables, then rules (RLS), then history triggers.

-- The admin is identified by this email (spec §8).
create or replace function public.admin_email() returns text
language sql immutable set search_path = public as $$ select 'ramopego@gmail.com'::text $$;

create or replace function public.is_admin() returns boolean
language sql stable set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = public.admin_email()
$$;

-- ---------------------------------------------------------------- tables

-- Single-row settings table. Sign-up starts closed: only the admin email can
-- register until Ramon opens the switch in his dashboard (spec §8).
create table public.settings (
  id boolean primary key default true check (id),
  signup_open boolean not null default false
);
insert into public.settings default values;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.years (
  id bigint generated always as identity primary key,
  name text not null check (length(trim(name)) > 0),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.subjects (
  id bigint generated always as identity primary key,
  year_id bigint not null references public.years (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

-- id is the internal order of entry (never shown, used for graphs over time).
create table public.grades (
  id bigint generated always as identity primary key,
  subject_id bigint not null references public.subjects (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  value numeric not null check (value >= 0 and value <= 6),
  weight numeric not null default 1 check (weight >= 0),
  created_at timestamptz not null default now()
);
create index grades_subject_id_idx on public.grades (subject_id);
create index grades_user_id_idx on public.grades (user_id);
create index subjects_year_id_idx on public.subjects (year_id);

-- Change history, written only by the triggers below, readable only by the admin.
create table public.history (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_email text,
  action text not null check (action in (
    'grade_added', 'grade_edited', 'grade_deleted',
    'subject_added', 'subject_renamed', 'subject_deleted',
    'year_created'
  )),
  year_name text,
  subject_name text,
  old_value numeric,
  new_value numeric,
  old_weight numeric,
  new_weight numeric,
  old_name text,
  new_name text,
  detail text
);

-- ---------------------------------------------------------------- sign-up

-- Blocks account creation while sign-up is closed (the admin email is always allowed).
create or replace function public.check_signup_allowed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = public.admin_email() then
    return new;
  end if;
  if not (select signup_open from public.settings where id) then
    raise exception 'signup_closed';
  end if;
  return new;
end $$;

create trigger gradesapp_check_signup
  before insert on auth.users
  for each row execute function public.check_signup_allowed();

create or replace function public.create_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, lower(new.email));
  return new;
end $$;

create trigger gradesapp_create_profile
  after insert on auth.users
  for each row execute function public.create_profile();

-- Lets the sign-up page show "closed" before the user fills in the form.
create or replace function public.signup_open() returns boolean
language sql stable security definer set search_path = public as $$
  select signup_open from public.settings where id
$$;

-- ---------------------------------------------------------------- years

-- Creating a year archives every other year: only one active year (spec §4).
create or replace function public.archive_previous_years() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.years set archived = true where not archived;
  new.archived := false;
  return new;
end $$;

create trigger gradesapp_archive_previous_years
  before insert on public.years
  for each row execute function public.archive_previous_years();

-- ---------------------------------------------------------------- history triggers

create or replace function public.log_year() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.history (actor_email, action, year_name)
  values (auth.jwt() ->> 'email', 'year_created', new.name);
  return new;
end $$;

create trigger gradesapp_log_year
  after insert on public.years
  for each row execute function public.log_year();

create or replace function public.log_subject() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  y text;
  n int;
begin
  if tg_op = 'INSERT' then
    select name into y from public.years where id = new.year_id;
    insert into public.history (actor_email, action, year_name, subject_name)
    values (auth.jwt() ->> 'email', 'subject_added', y, new.name);
    return new;
  elsif tg_op = 'UPDATE' then
    if new.name is distinct from old.name then
      select name into y from public.years where id = new.year_id;
      insert into public.history (actor_email, action, year_name, subject_name, old_name, new_name)
      values (auth.jwt() ->> 'email', 'subject_renamed', y, new.name, old.name, new.name);
    end if;
    return new;
  else
    -- BEFORE DELETE: the subject's grades still exist, so they can be counted.
    select name into y from public.years where id = old.year_id;
    select count(*) into n from public.grades where subject_id = old.id;
    insert into public.history (actor_email, action, year_name, subject_name, detail)
    values (auth.jwt() ->> 'email', 'subject_deleted', y, old.name,
            n || case when n = 1 then ' grade deleted with it' else ' grades deleted with it' end);
    return old;
  end if;
end $$;

create trigger gradesapp_log_subject_ins_upd
  after insert or update on public.subjects
  for each row execute function public.log_subject();

create trigger gradesapp_log_subject_del
  before delete on public.subjects
  for each row execute function public.log_subject();

create or replace function public.log_grade() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s text;
  y text;
  sid bigint := coalesce(new.subject_id, old.subject_id);
begin
  select sub.name, yr.name into s, y
  from public.subjects sub join public.years yr on yr.id = sub.year_id
  where sub.id = sid;

  if tg_op = 'DELETE' and s is null then
    -- The subject itself was deleted (cascade); that is logged once on the subject.
    return old;
  end if;

  if tg_op = 'INSERT' then
    insert into public.history (actor_email, action, year_name, subject_name, new_value, new_weight)
    values (auth.jwt() ->> 'email', 'grade_added', y, s, new.value, new.weight);
    return new;
  elsif tg_op = 'UPDATE' then
    if new.value is distinct from old.value or new.weight is distinct from old.weight then
      insert into public.history (actor_email, action, year_name, subject_name,
                                  old_value, new_value, old_weight, new_weight)
      values (auth.jwt() ->> 'email', 'grade_edited', y, s,
              old.value, new.value, old.weight, new.weight);
    end if;
    return new;
  else
    insert into public.history (actor_email, action, year_name, subject_name, old_value, old_weight)
    values (auth.jwt() ->> 'email', 'grade_deleted', y, s, old.value, old.weight);
    return old;
  end if;
end $$;

create trigger gradesapp_log_grade
  after insert or update or delete on public.grades
  for each row execute function public.log_grade();

-- ---------------------------------------------------------------- row level security

alter table public.settings enable row level security;
alter table public.profiles enable row level security;
alter table public.years enable row level security;
alter table public.subjects enable row level security;
alter table public.grades enable row level security;
alter table public.history enable row level security;

revoke all on public.settings, public.profiles, public.years, public.subjects,
              public.grades, public.history from anon;
grant select, update on public.settings to authenticated;
grant select on public.profiles to authenticated;
grant select, insert on public.years to authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select, insert, update, delete on public.grades to authenticated;
grant select on public.history to authenticated;
grant execute on function public.signup_open() to anon, authenticated;
-- Trigger functions are never called directly through the API.
revoke execute on function public.check_signup_allowed(), public.create_profile(),
  public.archive_previous_years(), public.log_year(), public.log_subject(), public.log_grade()
  from public, anon, authenticated;

-- settings: admin only
create policy settings_admin_read on public.settings
  for select to authenticated using (public.is_admin());
create policy settings_admin_update on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- profiles: own row, admin sees all
create policy profiles_read on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

-- years: everyone signed in reads, only admin creates
create policy years_read on public.years
  for select to authenticated using (true);
create policy years_admin_insert on public.years
  for insert to authenticated with check (public.is_admin());

-- subjects: everyone signed in reads; only admin adds/renames/deletes, and only in the active year
create policy subjects_read on public.subjects
  for select to authenticated using (true);
create policy subjects_admin_insert on public.subjects
  for insert to authenticated with check (
    public.is_admin()
    and exists (select 1 from public.years y where y.id = year_id and not y.archived));
create policy subjects_admin_update on public.subjects
  for update to authenticated
  using (public.is_admin()
         and exists (select 1 from public.years y where y.id = year_id and not y.archived))
  with check (public.is_admin()
         and exists (select 1 from public.years y where y.id = year_id and not y.archived));
create policy subjects_admin_delete on public.subjects
  for delete to authenticated using (
    public.is_admin()
    and exists (select 1 from public.years y where y.id = year_id and not y.archived));

-- grades: the student reads and writes her own (writes only in the active year);
-- the admin reads all and can never write (spec §5).
create or replace function public.subject_is_active(sid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subjects s join public.years y on y.id = s.year_id
    where s.id = sid and not y.archived)
$$;
revoke execute on function public.subject_is_active(bigint) from public, anon;
grant execute on function public.subject_is_active(bigint) to authenticated;

create policy grades_read on public.grades
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy grades_insert on public.grades
  for insert to authenticated with check (
    user_id = auth.uid() and not public.is_admin() and public.subject_is_active(subject_id));
create policy grades_update on public.grades
  for update to authenticated
  using (user_id = auth.uid() and not public.is_admin() and public.subject_is_active(subject_id))
  with check (user_id = auth.uid() and not public.is_admin() and public.subject_is_active(subject_id));
create policy grades_delete on public.grades
  for delete to authenticated using (
    user_id = auth.uid() and not public.is_admin() and public.subject_is_active(subject_id));

-- history: admin only
create policy history_admin_read on public.history
  for select to authenticated using (public.is_admin());
