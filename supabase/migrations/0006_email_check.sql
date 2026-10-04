create or replace function public.email_domain_ok(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.email_in_allowed_list(p_email);
$$;
grant execute on function public.email_domain_ok(text) to anon, authenticated;
