-- pgTAP: migration 0010 (course catalogue)
begin;
select plan(10);

insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-0000000000a1','student@x.edu','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000b2','admin@x.edu','authenticated','authenticated');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000b2');

select is((select name from public.courses where code = 'MA111C'), 'Calculus', 'semester 1 seed present');

-- approving a paper teaches the catalogue (code normalised, first name wins)
insert into public.papers (course_code, course_name, year, file_path, approve_status)
  values ('cs 10009', 'Data Structures', 2023, 'approved/a.pdf', true);
select is((select name from public.courses where code = 'CS10009'), 'Data Structures', 'approved paper adds its course');
insert into public.papers (course_code, course_name, year, file_path, approve_status)
  values ('CS10009', 'Other Name', 2024, 'approved/b.pdf', true);
select is((select name from public.courses where code = 'CS10009'), 'Data Structures', 'existing name is not overwritten');

-- pending, nameless and invalid-code papers add nothing and never error
insert into public.papers (course_code, course_name, year, file_path) values ('CS10010', 'Pending', 2023, 'unapproved/u/p.pdf');
select is((select count(*) from public.courses where code = 'CS10010'), 0::bigint, 'pending paper adds nothing');
select lives_ok($$insert into public.papers (course_code, course_name, year, file_path, approve_status)
  values ('XX', 'Bad code', 2023, 'approved/c.pdf', true)$$, 'invalid code does not block approval');
select is((select count(*) from public.courses where name = 'Bad code'), 0::bigint, 'invalid code is skipped');

-- approving a pending row later also teaches it
update public.papers set approve_status = true where course_code = 'CS10010';
select is((select count(*) from public.courses where code = 'CS10010'), 1::bigint, 'approving a pending paper adds its course');

-- access: public read, admin-only write
set local role anon;
select ok((select count(*) from public.courses) >= 8, 'anon can read the catalogue');
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"student@x.edu"}', true);
select throws_ok($$insert into public.courses (code, name) values ('ZZ999', 'Nope')$$, '42501', null, 'student cannot add courses');
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated","email":"admin@x.edu"}', true);
select lives_ok($$insert into public.courses (code, name) values ('ZZ999', 'Admin added')$$, 'admin can add courses');
reset role;

select * from finish();
rollback;
