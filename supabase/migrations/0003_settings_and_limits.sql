-- 0003: app settings, email-domain restriction, daily upload cap. STATUS: applies cleanly on Postgres 16 (session 7)
create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
drop policy if exists settings_read on public.app_settings;
create policy settings_read  on public.app_settings for select to anon, authenticated using (true);
drop policy if exists settings_admin on public.app_settings;
create policy settings_admin on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.app_settings (key, value) values
  ('daily_upload_cap', '20'),
  ('allowed_email_domain', '')       -- e.g. 'university.edu'; empty = any logged-in user
on conflict (key) do nothing;

create or replace function public.email_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.app_settings where key = 'allowed_email_domain'), '') = ''
      or lower(coalesce(auth.jwt() ->> 'email', ''))
         like ('%@' || lower((select value from public.app_settings where key = 'allowed_email_domain')));
$$;

drop policy if exists papers_user_insert on public.papers;
create policy papers_user_insert on public.papers for insert to authenticated
  with check (uploaded_by = auth.uid() and not approve_status
              and not from_library and not is_deleted
              and approved_by is null and file_hash is null
              and file_path like ('unapproved/' || auth.uid()::text || '/%')
              and file_path not like '%..%'
              and public.email_allowed());

create or replace function public.enforce_upload_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare cap integer;
begin
  if new.uploaded_by is null or public.is_admin() then return new; end if;
  select coalesce(nullif(value, '')::integer, 20) into cap
    from public.app_settings where key = 'daily_upload_cap';
  if (select count(*) from public.papers
        where uploaded_by = new.uploaded_by
          and upload_timestamp > now() - interval '24 hours') >= coalesce(cap, 20) then
    raise exception 'Daily upload limit reached' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists papers_upload_cap on public.papers;
create trigger papers_upload_cap before insert on public.papers
  for each row execute function public.enforce_upload_cap();

-- Storage rules that depend on the settings above (kept here because 0002 runs before email_allowed() exists).
-- 1) The email-domain restriction also applies to file uploads, not just to rows.
drop policy if exists unapproved_user_insert on storage.objects;
create policy unapproved_user_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'unapproved'
              and (storage.foldername(name))[1] = auth.uid()::text
              and public.email_allowed());
-- 2) A user may delete their OWN uploaded file only while no papers row points at it. This is what lets the
--    upload flow roll back a file when the row insert fails, without letting users delete submitted papers.
drop policy if exists unapproved_owner_cleanup on storage.objects;
create policy unapproved_owner_cleanup on storage.objects for delete to authenticated
  using (bucket_id = 'unapproved'
         and (storage.foldername(name))[1] = auth.uid()::text
         and not exists (select 1 from public.papers p where p.file_path = 'unapproved/' || name));
