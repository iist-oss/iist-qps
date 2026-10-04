-- 0008 (session 21): per-file limit 100 MiB -> 50 MiB (52428800 bytes), the most the Supabase Free plan allows project-wide.
-- 0007 may already be applied, so this is a new migration (D18).
update storage.buckets set file_size_limit = 52428800 where id in ('unapproved', 'approved');
