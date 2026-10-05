-- 0014: security hardening based on the October 2026 static review.

-- 1) The upload timestamp is server-controlled. This closes the daily-cap bypass
--    where a caller supplied an old upload_timestamp.
create or replace function public.enforce_upload_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
begin
  new.upload_timestamp := now();

  if new.uploaded_by is null or public.is_admin() then
    return new;
  end if;

  select coalesce(nullif(value, '')::integer, 20)
    into cap
    from public.app_settings
   where key = 'daily_upload_cap';

  if (
    select count(*)
      from public.papers
     where uploaded_by = new.uploaded_by
       and upload_timestamp > now() - interval '24 hours'
  ) >= coalesce(cap, 20) then
    raise exception 'Daily upload limit reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- 2) Prevent control characters in user-controlled text that can reach mail
--    headers, logs, exports, or other downstream systems.
alter table public.papers drop constraint if exists papers_text_control_chars;
alter table public.papers add constraint papers_text_control_chars check (
  course_code !~ '[[:cntrl:]]' and
  course_name !~ '[[:cntrl:]]' and
  exam !~ '[[:cntrl:]]' and
  semester !~ '[[:cntrl:]]' and
  note !~ '[[:cntrl:]]' and
  file_path !~ '[[:cntrl:]]'
);

-- 3) Student clients do not need uploader/admin UUIDs or file hashes. Keep
--    those columns inaccessible through the normal authenticated table API.
revoke select (uploaded_by, approved_by, file_hash) on public.papers from authenticated;

-- 4) Replace the public/anonymous stats probe with a deliberately data-free ping.
create or replace function public.ping()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select 1;
$$;
revoke execute on function public.ping() from public, authenticated;
grant execute on function public.ping() to anon;

-- get_stats remains signed-in only after migration 0013.
revoke execute on function public.email_domain_ok(text) from public, anon, authenticated;
revoke execute on function public.email_in_allowed_list(text) from public, anon, authenticated;

-- 5) Bound the number of unapproved objects a single user can keep in Storage.
--    This covers orphaned uploads that never reach the papers table. With the
--    existing 47 MiB object limit, one user can hold at most ~940 MiB here.
create or replace function public.unapproved_storage_quota_ok(p_user uuid)
returns boolean
language sql
security definer
set search_path = public, storage
set row_security = off
as $$
  select count(*) < 20
    from storage.objects
   where bucket_id = 'unapproved'
     and (storage.foldername(name))[1] = p_user::text;
$$;

revoke all on function public.unapproved_storage_quota_ok(uuid) from public, anon, authenticated;
grant execute on function public.unapproved_storage_quota_ok(uuid) to authenticated;

drop policy if exists unapproved_user_insert on storage.objects;
create policy unapproved_user_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'unapproved'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.email_allowed()
  and public.unapproved_storage_quota_ok(auth.uid())
);

-- 6) Preserve the "my uploads" feature without exposing uploaded_by as a
--    selectable/filterable column to the normal table API.
create or replace function public.my_uploads()
returns table (
  id bigint,
  course_code text,
  course_name text,
  year integer,
  exam text,
  semester text,
  note text,
  upload_timestamp timestamptz,
  approve_status boolean,
  is_deleted boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.course_code, p.course_name, p.year, p.exam, p.semester,
         p.note, p.upload_timestamp, p.approve_status, p.is_deleted
    from public.papers p
   where p.uploaded_by = auth.uid()
   order by p.upload_timestamp desc
   limit 200;
$$;
revoke all on function public.my_uploads() from public, anon;
grant execute on function public.my_uploads() to authenticated;
