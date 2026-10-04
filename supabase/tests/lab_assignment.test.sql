-- pgTAP: migration 0007 (lab/assignment exam types, 100 MiB bucket limit)
begin;
select plan(6);
select lives_ok($$insert into public.papers (course_code, year, exam, file_path) values ('AA131V', 2024, 'lab', 'unapproved/u/l.pdf')$$, 'exam=lab accepted');
select lives_ok($$insert into public.papers (course_code, year, exam, file_path) values ('PH112C', 2024, 'assignment', 'unapproved/u/a.pdf')$$, 'exam=assignment accepted');
select lives_ok($$insert into public.papers (course_code, year, exam, file_path) values ('MA111C', 2024, 'ct2', 'unapproved/u/c.pdf')$$, 'ct2 still accepted');
select throws_ok($$insert into public.papers (course_code, year, exam, file_path) values ('MA111C', 2024, 'quiz', 'unapproved/u/q.pdf')$$, '23514', null, 'unknown exam type still rejected');
select is((select file_size_limit from storage.buckets where id = 'unapproved'), 104857600::bigint, 'unapproved bucket = 100 MiB');
select is((select file_size_limit from storage.buckets where id = 'approved'), 104857600::bigint, 'approved bucket = 100 MiB');
select * from finish();
rollback;
