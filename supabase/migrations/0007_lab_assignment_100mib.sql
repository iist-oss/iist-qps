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

update storage.buckets set file_size_limit = 104857600 where id in ('unapproved', 'approved');
