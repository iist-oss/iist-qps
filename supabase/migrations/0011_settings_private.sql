-- 0011 (session 30): app_settings was readable by everyone (policy settings_read, 0003), and 0005 added
-- `allowed_extra_emails` (exact addresses, e.g. a bootstrap admin) to it, so anyone could list those addresses
-- through the REST API. Nothing in the frontend or the Edge Functions reads this table with an anon/user key
-- (the functions that need it are SECURITY DEFINER, the Edge Functions use the service role), so admins only.
drop policy if exists settings_read on public.app_settings;
-- settings_admin (for all, is_admin()) from 0003 stays.
