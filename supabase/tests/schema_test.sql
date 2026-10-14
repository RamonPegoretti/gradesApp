-- Checks the access rules and history triggers. Run after supabase_shim.sql and schema.sql.
\set ON_ERROR_STOP 1
\pset tuples_only on
create schema t;

create function t.must_fail(stmt text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'expected failure, but it succeeded: %', stmt;
exception when others then
  if sqlerrm like 'expected failure%' then raise; end if;
end $$;

create function t.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'check failed: %', what; end if;
end $$;

create function t.login(email text) returns void language sql security definer as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', (select id from auth.users u where u.email = login.email), 'email', email)::text, false)
$$;

-- Sign-up starts closed; only the admin email gets through.
insert into auth.users (email) values ('ramopego@gmail.com');
select t.must_fail($$insert into auth.users (email) values ('student@example.com')$$);
update public.settings set signup_open = true;
insert into auth.users (email) values ('student@example.com');
select t.check((select count(*) from public.profiles) = 2, 'profiles created');

grant usage on schema t to authenticated, anon;
grant execute on all functions in schema t to authenticated, anon;
set role authenticated;

-- Admin sets up the year.
select t.login('ramopego@gmail.com');
insert into public.years (name) values ('Y1');
insert into public.subjects (year_id, name) select id, 'Math' from public.years;
insert into public.subjects (year_id, name) select id, 'History' from public.years;
update public.subjects set name = 'Maths' where name = 'Math';
select t.must_fail($$insert into public.grades (subject_id, value) select id, 5 from public.subjects limit 1$$);
update public.settings set signup_open = false;

-- Student manages her own grades only.
select t.login('student@example.com');
insert into public.grades (subject_id, value, weight) select id, 5.25, 1 from public.subjects where name = 'Maths';
insert into public.grades (subject_id, value, weight) select id, 4, 2 from public.subjects where name = 'Maths';
insert into public.grades (subject_id, value, weight) select id, 6, 0 from public.subjects where name = 'History';
update public.grades set value = 4.5 where value = 5.25;
delete from public.grades where value = 6;
select t.must_fail($$insert into public.grades (subject_id, value) select id, 6.5 from public.subjects limit 1$$);
select t.must_fail($$insert into public.grades (subject_id, value, weight) select id, 5, -1 from public.subjects limit 1$$);
select t.must_fail($$insert into public.subjects (year_id, name) select id, 'X' from public.years$$);
select t.must_fail($$insert into public.years (name) values ('Y2')$$);
select t.check((select count(*) from public.history) = 0, 'student cannot read history');
update public.settings set signup_open = true; -- silently affects nothing
select t.check(not public.signup_open(), 'student cannot open sign-up');

-- Admin deletes a subject (its grades go with it) and starts a new year.
select t.login('ramopego@gmail.com');
select t.check((select count(*) from public.grades) = 2, 'admin reads all grades');
update public.grades set value = 1; -- RLS: matches no rows for the admin
select t.check((select count(*) from public.grades where value = 1) = 0, 'admin cannot edit grades');
delete from public.subjects where name = 'Maths';
select t.check((select count(*) from public.grades) = 0, 'grades deleted with subject');
insert into public.years (name) values ('Y2');
select t.check((select count(*) from public.years where not archived) = 1, 'one active year');
select t.check((select name from public.years where not archived) = 'Y2', 'new year active');
select t.must_fail($$insert into public.subjects (year_id, name) select id, 'Late' from public.years where name = 'Y1'$$);

-- Student cannot write in an archived year.
select t.login('student@example.com');
select t.must_fail($$insert into public.grades (subject_id, value) select id, 5 from public.subjects where name = 'History'$$);

-- History, in order.
select t.login('ramopego@gmail.com');
select t.check(
  (select string_agg(action, ',' order by id) from public.history) =
  'year_created,subject_added,subject_added,subject_renamed,grade_added,grade_added,grade_added,grade_edited,grade_deleted,subject_deleted,year_created',
  'history actions');
select t.check(
  (select old_value = 5.25 and new_value = 4.5 and actor_email = 'student@example.com'
   from public.history where action = 'grade_edited'), 'edit logged with old and new');
select t.check(
  (select detail = '2 grades deleted with it' from public.history where action = 'subject_deleted'), 'delete count');

reset role;
set role anon;
select t.must_fail($$select * from public.grades$$);
select 'schema tests passed' as result;
