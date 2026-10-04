-- 0012 (session 32): which curriculum semester (1..12) a course belongs to.
-- Used to pre-fill odd/even on uploads and in the review queue (B.Tech semester 1 = odd, 2 = even; D25).
-- Nullable: a course without a number simply gets no pre-fill. Safe to run twice.
alter table public.courses add column if not exists sem_no smallint;
alter table public.courses drop constraint if exists courses_sem_no_range;
alter table public.courses add constraint courses_sem_no_range check (sem_no is null or sem_no between 1 and 12);

-- The Semester 1 courses seeded by 0010.
update public.courses set sem_no = 1 where source = 'seed' and sem_no is null;
