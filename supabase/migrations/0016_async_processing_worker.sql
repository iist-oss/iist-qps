-- 0016: asynchronous server-side processing pipeline.
-- Uploads are validated and OCR'd by a trusted worker, not by the browser.

-- Queue validation automatically when a paper is inserted. This prevents a
-- client from skipping the processing pipeline after creating a paper row.
create or replace function public.enqueue_validation_for_new_paper()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.processing_jobs (paper_id, job_type)
  values (new.id, 'validate_pdf')
  on conflict (paper_id, job_type) where status in ('queued','processing') do nothing;
  return new;
end;
$$;

revoke all on function public.enqueue_validation_for_new_paper() from public, anon, authenticated;

drop trigger if exists papers_enqueue_validation on public.papers;
create trigger papers_enqueue_validation
after insert on public.papers
for each row execute function public.enqueue_validation_for_new_paper();

-- The client-side enqueue call is no longer authoritative. Keep the RPC for
-- backwards compatibility, but only permit it to create the first validation job.
create or replace function public.enqueue_processing_job(
  p_paper_id bigint,
  p_job_type text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare jid bigint;
begin
  if p_job_type <> 'validate_pdf' then
    raise exception 'Clients may only enqueue validation jobs';
  end if;
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

-- A trusted worker may update only processing fields through this RPC. The
-- function also advances the paper state atomically with the job result.
create or replace function public.complete_processing_step(
  p_job_id bigint,
  p_success boolean,
  p_next_job_type text default null,
  p_error text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  j public.processing_jobs;
  next_id bigint;
begin
  select * into j from public.processing_jobs where id = p_job_id for update;
  if not found then raise exception 'Job not found'; end if;

  if p_success then
    update public.processing_jobs
       set status = 'succeeded', last_error = '', completed_at = now(),
           locked_at = null, locked_by = null
     where id = p_job_id;

    if p_next_job_type is not null then
      insert into public.processing_jobs (paper_id, job_type)
      values (j.paper_id, p_next_job_type)
      on conflict (paper_id, job_type) where status in ('queued','processing') do nothing
      returning id into next_id;
    end if;

    update public.papers
       set processing_status = case
             when p_next_job_type = 'ocr' then 'processing'
             else processing_status
           end,
           processing_error = '',
           processed_at = case when p_next_job_type is null then now() else processed_at end
     where id = j.paper_id;
  else
    update public.processing_jobs
       set status = case when attempts < 5 then 'queued' else 'failed' end,
           last_error = left(coalesce(p_error, 'Processing failed'), 2000),
           available_at = case when attempts < 5 then now() + make_interval(secs => least(300, attempts * 30)) else available_at end,
           completed_at = case when attempts < 5 then null else now() end,
           locked_at = null, locked_by = null
     where id = p_job_id;

    update public.papers
       set processing_status = case when attempts >= 5 then 'failed' else 'processing' end,
           processing_error = left(coalesce(p_error, 'Processing failed'), 1000)
     where id = j.paper_id;
  end if;
end;
$$;

revoke all on function public.complete_processing_step(bigint, boolean, text, text) from public, anon, authenticated;
grant execute on function public.complete_processing_step(bigint, boolean, text, text) to service_role;

-- Trusted workers need to store extracted OCR text without exposing it to the
-- student-facing papers API.
alter table public.papers
  add column if not exists ocr_text text not null default '';

revoke select (ocr_text) on public.papers from authenticated;

-- Searchable extracted text for future question-level search. Keep it as a
-- generated GIN index rather than making the frontend query OCR text directly.
create unique index if not exists papers_active_file_hash_unique
  on public.papers (file_hash)
  where file_hash is not null and file_hash <> '' and not is_deleted;

create index if not exists papers_ocr_search_idx
  on public.papers using gin (to_tsvector('english', coalesce(ocr_text, '')));
