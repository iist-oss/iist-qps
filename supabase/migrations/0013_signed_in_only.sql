-- 0013: only signed-in users with an allowed university email can read anything.
-- Deploy the new frontend (signed PDF links + login guard) BEFORE running this,
-- because it makes the "approved" bucket private.

-- Papers: no more anonymous reads.
drop policy if exists papers_public_read on public.papers;
create policy papers_public_read on public.papers for select to authenticated
  using (approve_status and not is_deleted and public.email_allowed());

-- Courses: same.
drop policy if exists courses_public_read on public.courses;
create policy courses_public_read on public.courses for select to authenticated
  using (public.email_allowed());
revoke select on public.courses from anon;

-- Functions: signed-in only.
revoke execute on function public.search_papers(text, text[]) from public, anon;
grant  execute on function public.search_papers(text, text[]) to authenticated;

create or replace function public.get_stats()
returns table (total_papers bigint, total_courses bigint)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where approve_status and not is_deleted),
         count(distinct course_code) filter (where approve_status and not is_deleted)
  from public.papers
  where public.email_allowed() or public.is_admin();
$$;
revoke execute on function public.get_stats() from public, anon;
grant  execute on function public.get_stats() to authenticated;

-- Approved PDFs: private bucket, readable (via signed links) by signed-in allowed users.
update storage.buckets set public = false where id = 'approved';

drop policy if exists approved_signed_in_read on storage.objects;
create policy approved_signed_in_read on storage.objects for select to authenticated
  using (bucket_id = 'approved' and public.email_allowed());
