-- pgTAP: admin_apply_edit. STATUS: UNTESTED
begin;
select plan(5);

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000b2','admin@x.edu','authenticated','authenticated');
insert into public.papers (course_code, course_name, year, file_path) values
 ('AA10001','Old name',2023,'unapproved/u/1.pdf'),
 ('BB10002','Duplicate',2023,'unapproved/u/2.pdf');

set local role service_role;
select is(
  (select approve_status from public.admin_apply_edit(
     (select id from public.papers where course_code='AA10001'),
     'AA10001','New name',2023,'endsem','odd','',true,'approved/x.pdf',
     '00000000-0000-0000-0000-0000000000b2'::uuid,
     array[(select id from public.papers where course_code='BB10002')])),
  true, 'edit approves the paper');
select is((select course_name from public.papers where course_code='AA10001'),
  'New name', 'metadata updated');
select is((select approved_by from public.papers where course_code='AA10001'),
  '00000000-0000-0000-0000-0000000000b2'::uuid, 'approved_by recorded');
select is((select is_deleted from public.papers where course_code='BB10002'),
  true, 'replaced paper soft-deleted');
reset role;

set local role authenticated;
select throws_ok($$select public.admin_apply_edit(1,'a','b',2020,'','','',true,'x',null,'{}')$$,
  '42501', null, 'logged-in users cannot call admin_apply_edit');
reset role;

select * from finish();
rollback;
