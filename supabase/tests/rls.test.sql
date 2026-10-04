-- pgTAP tests, run with `supabase test db`. Verified in session 7 with a minimal pgTAP shim on Postgres 16.
begin;
select plan(15);

insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-0000000000a1','student@x.edu','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000b2','admin@x.edu','authenticated','authenticated');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000b2');
-- `supabase test db` runs after seed.sql, so start from an empty table (rolled back at the end).
delete from public.papers;

insert into public.papers (course_code, course_name, year, file_path, approve_status) values
 ('CS10001','Data Structures',2023,'approved/a.pdf',true),
 ('CS10002','Algorithms',2023,'unapproved/hidden.pdf',false);

-- 1 anon sees only approved
set local role anon;
select is((select count(*) from public.papers), 1::bigint, 'anon sees only approved papers');
-- 2 search works and returns only approved
select is((select count(*) from public.search_papers('Data')), 1::bigint, 'search finds approved paper');
select is((select count(*) from public.search_papers('Algorithms')), 0::bigint, 'search hides unapproved paper');
-- 4 junk query must not error
select lives_ok($$select * from public.search_papers('!!!')$$, 'junk query does not error');
reset role;

-- student
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"student@x.edu"}', true);
select lives_ok($$insert into public.papers (course_code,course_name,year,file_path,uploaded_by)
  values ('MA11003','Linear Algebra',2022,'unapproved/00000000-0000-0000-0000-0000000000a1/x.pdf','00000000-0000-0000-0000-0000000000a1')$$,
  'student can insert own unapproved paper');
select throws_ok($$insert into public.papers (course_code,course_name,year,file_path,uploaded_by,approve_status)
  values ('MA11003','Linear Algebra',2022,'x','00000000-0000-0000-0000-0000000000a1',true)$$,
  '42501', null, 'student cannot self-approve');
update public.papers set note = 'hax';
reset role;
select is((select count(*) from public.papers where note = 'hax'), 0::bigint, 'student cannot update papers');
-- student cannot point a row at someone else's file (would let approval move/rename it)
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"student@x.edu"}', true);
select throws_ok($$insert into public.papers (course_code,course_name,year,file_path,uploaded_by)
  values ('MA11003','Linear Algebra',2022,'approved/a.pdf','00000000-0000-0000-0000-0000000000a1')$$,
  '42501', null, 'student cannot reference a file outside their own folder');
select throws_ok($$insert into public.papers (course_code,course_name,year,file_path,uploaded_by)
  values ('MA11003','Linear Algebra',1800,'unapproved/00000000-0000-0000-0000-0000000000a1/y.pdf','00000000-0000-0000-0000-0000000000a1')$$,
  '23514', null, 'implausible year rejected');
reset role;

-- admin sees everything
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated","email":"admin@x.edu"}', true);
select is((select count(*) from public.papers), 3::bigint, 'admin sees all papers');
reset role;

-- daily cap
update public.app_settings set value = '2' where key = 'daily_upload_cap';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"student@x.edu"}', true);
select throws_ok($$insert into public.papers (course_code,course_name,year,file_path,uploaded_by)
  select 'CS1000'||g,'Cap test',2024,'unapproved/00000000-0000-0000-0000-0000000000a1/'||g||'.pdf','00000000-0000-0000-0000-0000000000a1'
  from generate_series(1,3) g$$, 'P0001', 'Daily upload limit reached', 'daily cap enforced');
reset role;

-- email-domain restriction applies to rows and files
update public.app_settings set value = 'x.edu' where key = 'allowed_email_domain';
update public.app_settings set value = '20' where key = 'daily_upload_cap';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"student@other.com"}', true);
select throws_ok($$insert into public.papers (course_code,course_name,year,file_path,uploaded_by)
  values ('MA11003','Linear Algebra',2022,'unapproved/00000000-0000-0000-0000-0000000000a1/z.pdf','00000000-0000-0000-0000-0000000000a1')$$,
  '42501', null, 'wrong email domain cannot insert');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('unapproved','00000000-0000-0000-0000-0000000000a1/z.pdf')$$,
  '42501', null, 'wrong email domain cannot upload a file');
reset role;

-- storage cleanup policy: own orphan file deletable, file referenced by a row is not
insert into storage.objects (bucket_id, name) values ('unapproved','00000000-0000-0000-0000-0000000000a1/orphan.pdf'), ('unapproved','00000000-0000-0000-0000-0000000000a1/x.pdf');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"student@x.edu"}', true);
delete from storage.objects where name = '00000000-0000-0000-0000-0000000000a1/orphan.pdf';
delete from storage.objects where name = '00000000-0000-0000-0000-0000000000a1/x.pdf';
reset role;
select is((select count(*) from storage.objects where name like '%/orphan.pdf'), 0::bigint, 'user can delete own unreferenced file');
select is((select count(*) from storage.objects where name like '%/x.pdf'), 1::bigint, 'user cannot delete a file referenced by a paper');

select * from finish();
rollback;
