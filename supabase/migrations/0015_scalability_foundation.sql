-- 0015: scalability foundation
-- Keeps the current Supabase architecture while preparing for indexed search,
-- asynchronous processing, pagination, and reliable deduplication.

-- Faster common browse/filter paths.
create index if not exists papers_approved_browse_idx
  on public.papers (approve_status, is_deleted, year desc, id desc)
  where approve_status and not is_deleted;

create index if not exists papers_course_year_idx
  on public.papers (course_code, year desc, id desc)
  where approve_status and not is_deleted;

create index if not exists papers_exam_semester_idx
  on public.papers (exam, semester, year desc, id desc)
  where approve_status and not is_deleted;

create index if not exists papers_uploaded_by_time_idx
  on public.papers (uploaded_by, upload_timestamp desc, id desc);

-- Explicit processing state allows uploads to become asynchronous later without
-- changing the papers API. Existing papers are already ready for review/published.
alter table public.papers
  add column if not exists processing_status text not null default 'ready_for_review'
  check (processing_status in ('uploaded','processing','ready_for_review','failed','approved','published'));

alter table public.papers
  add column if not exists processing_error text not null default ''
  check (char_length(processing_error) <= 1000);

alter table public.papers
  add column if not exists processed_at timestamptz;

-- Queue table. Workers can claim rows atomically using claim_processing_jobs().
create table if not exists public.processing_jobs (
  id bigint generated always as identity primary key,
  paper_id bigint not null references public.papers(id) on delete cascade,
  job_type text not null check (job_type in ('validate_pdf','ocr','extract_metadata','generate_preview')),
  status text not null default 'queued' check (status in ('queued','processing','succeeded','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text not null default '' check (char_length(last_error) <= 2000),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists processing_jobs_claim_idx
  on public.processing_jobs (status, available_at, id)
  where status = 'queued';

create index if not exists processing_jobs_paper_idx
  on public.processing_jobs (paper_id, created_at desc);

create unique index if not exists processing_jobs_active_unique
  on public.processing_jobs (paper_id, job_type)
  where status in ('queued','processing');

alter table public.processing_jobs enable row level security;

-- Students can see the status of their own processing jobs; workers use service_role.
drop policy if exists processing_jobs_own_read on public.processing_jobs;
create policy processing_jobs_own_read on public.processing_jobs
  for select to authenticated
  using (exists (
    select 1 from public.papers p
    where p.id = processing_jobs.paper_id
      and p.uploaded_by = auth.uid()
  ));

drop policy if exists processing_jobs_admin_all on public.processing_jobs;
create policy processing_jobs_admin_all on public.processing_jobs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Workers should use service_role; no client gets queue mutation privileges.
revoke all on public.processing_jobs from anon, authenticated;

create or replace function public.enqueue_processing_job(
  p_paper_id bigint,
  p_job_type text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  jid bigint;
begin
  if not exists (
    select 1 from public.papers
    where id = p_paper_id and uploaded_by = auth.uid()
  ) and not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  insert into public.processing_jobs (paper_id, job_type)
  values (p_paper_id, p_job_type)
  on conflict (paper_id, job_type) where status in ('queued','processing') do nothing
  returning id into jid;

  return jid;
end;
$$;

revoke all on function public.enqueue_processing_job(bigint, text) from public, anon;
grant execute on function public.enqueue_processing_job(bigint, text) to authenticated;

create or replace function public.claim_processing_jobs(
  p_worker text,
  p_limit integer default 10
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select id
    from public.processing_jobs
    where status = 'queued'
      and available_at <= now()
    order by id
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 100))
  )
  update public.processing_jobs j
     set status = 'processing',
         attempts = attempts + 1,
         locked_at = now(),
         locked_by = p_worker
    from picked
   where j.id = picked.id
  returning j.*;
end;
$$;

revoke all on function public.claim_processing_jobs(text, integer) from public, anon, authenticated;

-- Requeue jobs whose worker disappeared. Intended for trusted server-side workers.
create or replace function public.requeue_stale_processing_jobs(p_age interval default interval '15 minutes')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  update public.processing_jobs
     set status = 'queued', locked_at = null, locked_by = null,
         available_at = now() + interval '30 seconds'
   where status = 'processing'
     and locked_at < now() - p_age
     and attempts < 5;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.requeue_stale_processing_jobs(interval) from public, anon, authenticated;

-- Idempotent helper for a future server-side worker.
create or replace function public.finish_processing_job(
  p_job_id bigint,
  p_success boolean,
  p_error text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.processing_jobs
     set status = case when p_success then 'succeeded' else 'failed' end,
         last_error = left(coalesce(p_error, ''), 2000),
         completed_at = now(),
         locked_at = null,
         locked_by = null
   where id = p_job_id;
end;
$$;

revoke all on function public.finish_processing_job(bigint, boolean, text) from public, anon, authenticated;

-- Paginated approved-paper API. This avoids pulling an ever-growing archive into
-- the browser and gives the UI a stable cursor.
create or replace function public.list_papers(
  p_limit integer default 50,
  p_before_id bigint default null,
  p_course_code text default null,
  p_year integer default null,
  p_exam text default null,
  p_semester text default null
)
returns table (
  id bigint,
  file_path text,
  from_library boolean,
  course_code text,
  course_name text,
  year integer,
  semester text,
  exam text,
  note text
)
language sql stable security invoker set search_path = public as $$
  select p.id, p.file_path, p.from_library, p.course_code, p.course_name,
         p.year, p.semester, p.exam, p.note
    from public.papers p
   where p.approve_status
     and not p.is_deleted
     and (p_before_id is null or p.id < p_before_id)
     and (nullif(trim(p_course_code), '') is null or p.course_code = p_course_code)
     and (p_year is null or p.year = p_year)
     and (nullif(trim(p_exam), '') is null or p.exam = p_exam)
     and (nullif(trim(p_semester), '') is null or p.semester = p_semester)
   order by p.id desc
   limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

grant execute on function public.list_papers(integer, bigint, text, integer, text, text) to authenticated;

-- Client-side SHA-256 is supplied for deduplication. It is not an authorization
-- primitive; the unique index only prevents identical active hashes.
drop policy if exists papers_user_insert on public.papers;
create policy papers_user_insert on public.papers for insert to authenticated
  with check (uploaded_by = auth.uid() and not approve_status
              and not from_library and not is_deleted
              and approved_by is null);
