-- 0009 (session 22): per-file limit 50 MiB -> 47 MiB (49283072 bytes), safely under a 50,000,000-byte project cap.
-- 0008 may already be applied, so this is a new migration (D18).
update storage.buckets set file_size_limit = 49283072 where id in ('unapproved', 'approved');
