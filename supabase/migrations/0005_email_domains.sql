-- 0005: several allowed email domains + block sign-up for everyone else.
-- app_settings.allowed_email_domain = comma-separated list, e.g. 'iist.ac.in,ug.iist.ac.in'
--   (a subdomain must be listed on its own; empty = no restriction).
-- app_settings.allowed_extra_emails = optional comma-separated exact addresses allowed in addition
--   (e.g. a bootstrap admin who has no university address).
insert into public.app_settings (key, value) values ('allowed_extra_emails', '')
on conflict (key) do nothing;

create or replace function public.email_in_allowed_list(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  with s as (
    select
      lower(coalesce((select value from public.app_settings where key = 'allowed_email_domain'), '')) as domains,
      lower(coalesce((select value from public.app_settings where key = 'allowed_extra_emails'), '')) as extras,
      lower(trim(coalesce(p_email, ''))) as email
  )
  select trim(s.domains) = ''
      or exists (select 1 from unnest(string_to_array(s.domains, ',')) d
                 where trim(d) <> '' and s.email like ('%@' || trim(d)))
      or exists (select 1 from unnest(string_to_array(s.extras, ',')) e
                 where trim(e) <> '' and s.email = trim(e))
  from s;
$$;

-- same signature as before, so existing policies keep working unchanged
create or replace function public.email_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select public.email_in_allowed_list(auth.jwt() ->> 'email');
$$;

-- Refuse to create accounts for disallowed emails (existing users are unaffected).
create or replace function public.enforce_signup_domain()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.email_in_allowed_list(new.email) then
    raise exception 'Sign-up is limited to university email addresses.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists enforce_signup_domain on auth.users;
create trigger enforce_signup_domain before insert on auth.users
  for each row execute function public.enforce_signup_domain();
