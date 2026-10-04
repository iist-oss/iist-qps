alter table public.courses add column if not exists sem_no smallint;
alter table public.courses drop constraint if exists courses_sem_no_range;
alter table public.courses add constraint courses_sem_no_range check (sem_no is null or sem_no between 1 and 12);

update public.courses set sem_no = 1 where source = 'seed' and sem_no is null;
