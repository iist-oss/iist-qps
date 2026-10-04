-- 0006: lets the login page ask "is this email allowed?" BEFORE sending a code, so non-university
-- people get a clear message instead of Supabase's generic "Database error saving new user".
-- Returns only true/false (no list of domains or addresses is exposed). The sign-up trigger from 0005
-- remains the real lock.
create or replace function public.email_domain_ok(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.email_in_allowed_list(p_email);
$$;
grant execute on function public.email_domain_ok(text) to anon, authenticated;
