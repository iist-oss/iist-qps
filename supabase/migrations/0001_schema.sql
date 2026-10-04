create extension if not exists pg_trgm;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create table if not exists public.papers (
  id               bigint generated always as identity primary key,
  course_code      text not null default '' check (char_length(course_code) <= 20),
  course_name      text not null default '' check (char_length(course_name) <= 200),
  year             integer not null check (year between 1950 and 2100),
  exam             text not null default ''
                   check (exam in ('', 'midsem', 'endsem') or exam ~ '^ct[0-9]*$'),
  semester         text not null default '' check (semester in ('', 'odd', 'even')),
  note             text not null default '' check (char_length(note) <= 200),
  file_path        text not null,
  from_library     boolean not null default false,
  file_hash        text,
  uploaded_by      uuid references auth.users(id) on delete set null,
  upload_timestamp timestamptz not null default now(),
  approve_status   boolean not null default false,
  approved_by      uuid references auth.users(id) on delete set null,
  is_deleted       boolean not null default false,
  fts tsvector generated always as
      (to_tsvector('english', course_code || ' ' || course_name)) stored
);

create index if not exists papers_fts_idx   on public.papers using gin (fts);
create index if not exists papers_name_trgm on public.papers using gin (course_name gin_trgm_ops);
create index if not exists papers_code_idx  on public.papers (course_code);
create unique index if not exists papers_hash_uniq on public.papers (file_hash)
  where file_hash is not null and not is_deleted;

alter table public.papers enable row level security;
alter table public.admins enable row level security;

drop policy if exists papers_public_read on public.papers;
create policy papers_public_read on public.papers for select to anon, authenticated
  using (approve_status and not is_deleted);
drop policy if exists papers_own_read on public.papers;
create policy papers_own_read on public.papers for select to authenticated
  using (uploaded_by = auth.uid());
drop policy if exists papers_user_insert on public.papers;
create policy papers_user_insert on public.papers for insert to authenticated
  with check (uploaded_by = auth.uid() and not approve_status
              and not from_library and not is_deleted
              and approved_by is null and file_hash is null);
drop policy if exists papers_admin_all on public.papers;
create policy papers_admin_all on public.papers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins for select to authenticated
  using (user_id = auth.uid());

create or replace function public.search_papers(q text, exams text[] default '{}')
returns table (id bigint, file_path text, from_library boolean, course_code text,
               course_name text, year integer, semester text, exam text, note text)
language sql stable security invoker set search_path = public as $$
  with filtered as (
    select * from public.papers p
    where p.approve_status and not p.is_deleted
      and (coalesce(cardinality(exams), 0) = 0
           or p.exam = ''
           or p.exam = any(exams)
           or (p.exam like 'ct%' and 'ct' = any(exams)))
  ),
  fuzzy as (
    select f.id,
           row_number() over (order by similarity(f.course_code || ' ' || f.course_name, q) desc) as rix
    from filtered f
    where (f.course_code || ' ' || f.course_name) %>> q
    order by rix limit 30
  ),
  full_text as (
    select f.id,
           row_number() over (order by ts_rank_cd(f.fts, websearch_to_tsquery('english', q)) desc) as rix
    from filtered f
    where f.fts @@ websearch_to_tsquery('english', q)
    order by rix limit 30
  ),
  pq as (
    select case when numnode(websearch_to_tsquery('simple', q)) = 0 then null
                else to_tsquery('simple', websearch_to_tsquery('simple', q)::text || ':*')
           end as tsq
  ),
  partial as (
    select f.id,
           row_number() over (order by ts_rank_cd(f.fts, pq.tsq) desc) as rix
    from filtered f, pq
    where pq.tsq is not null and f.fts @@ pq.tsq
    order by rix limit 30
  ),
  ranked as (
    select coalesce(fz.id, ft.id, ps.id) as id,
           coalesce(1.0 / (50 + fz.rix), 0) + coalesce(1.0 / (50 + ft.rix), 0)
           + coalesce(1.0 / (50 + ps.rix), 0) as score
    from fuzzy fz
    full outer join full_text ft on fz.id = ft.id
    full outer join partial ps on coalesce(fz.id, ft.id) = ps.id
  )
  select f.id, f.file_path, f.from_library, f.course_code, f.course_name,
         f.year, f.semester, f.exam, f.note
  from ranked r join filtered f on f.id = r.id
  order by r.score desc, f.year desc;
$$;

create or replace function public.get_stats()
returns table (total_papers bigint, total_courses bigint)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where approve_status and not is_deleted),
         count(distinct course_code) filter (where approve_status and not is_deleted)
  from public.papers;
$$;

grant execute on function public.search_papers(text, text[]) to anon, authenticated;
grant execute on function public.get_stats() to anon, authenticated;
