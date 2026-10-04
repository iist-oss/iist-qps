-- pgTAP: migration 0012 (course semester number)
begin;
select plan(5);

select is((select count(*) from information_schema.columns
           where table_schema = 'public' and table_name = 'courses' and column_name = 'sem_no'),
          1::bigint, 'courses has a sem_no column');
select is((select sem_no from public.courses where code = 'MA111C'), 1::smallint, 'seeded Semester 1 courses are marked semester 1');
select lives_ok($$insert into public.courses (code, name, sem_no) values ('ZZ201', 'Test course', 2)$$, 'a valid semester number is accepted');
select is((select sem_no from public.courses where code = 'ZZ201'), 2::smallint, 'the number is stored');
select throws_ok($$insert into public.courses (code, name, sem_no) values ('ZZ202', 'Bad semester', 13)$$, '23514', null, 'semester 13 is rejected');

select * from finish();
rollback;
