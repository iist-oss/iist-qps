-- 0002: storage buckets + policies. STATUS: not run against real Supabase storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('unapproved', 'unapproved', false, 10485760, array['application/pdf']),
  ('approved',   'approved',   true,  10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Users upload only into their own folder: unapproved/<uid>/<file>.pdf
drop policy if exists unapproved_user_insert on storage.objects;
create policy unapproved_user_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'unapproved'
              and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists unapproved_owner_read on storage.objects;
create policy unapproved_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'unapproved'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists storage_admin_all on storage.objects;
create policy storage_admin_all on storage.objects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- 'approved' is a public bucket, so anyone can read via the public URL.
