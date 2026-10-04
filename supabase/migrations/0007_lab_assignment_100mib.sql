-- 0007 (session 19): two new paper types ('lab', 'assignment') and a 100 MiB per-file limit.
-- Never edit 0001/0002: they are applied in production (D18), so changes are a new migration.

-- 1) exam CHECK: drop whatever CHECK on public.papers mentions "exam" (the auto-named one from 0001), add the new one.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.papers'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%exam%'
  loop
    execute format('alter table public.papers drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.papers add constraint papers_exam_check
  check (exam in ('', 'midsem', 'endsem', 'lab', 'assignment') or exam ~ '^ct[0-9]*$');

-- 2) bucket limit 10 MiB -> 100 MiB (104857600 bytes). NOTE: the project-wide cap in Dashboard -> Storage -> Settings
--    ("Upload file size limit") also applies; the effective limit is the smaller of the two.
update storage.buckets set file_size_limit = 104857600 where id in ('unapproved', 'approved');
