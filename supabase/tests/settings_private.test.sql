-- pgTAP: migration 0011 (app_settings no longer public)
begin;
select plan(4);
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-0000000000a1','student@x.edu','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000b2','admin@x.edu','authenticated','authenticated');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000b2');
update public.app_settings set value = 'secret@example.com' where key = 'allowed_extra_emails';

set local role anon;
select is((select count(*) from public.app_settings), 0::bigint, 'anon cannot read settings');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"student@x.edu"}', true);
select is((select count(*) from public.app_settings), 0::bigint, 'students cannot read settings');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated","email":"admin@x.edu"}', true);
select ok((select count(*) from public.app_settings) >= 3, 'admin can read settings');
reset role;
-- the lock functions still work for everyone (they are SECURITY DEFINER)
set local role anon;
select ok(public.email_domain_ok('someone@nowhere.org') is not null, 'email_domain_ok still callable by anon');
reset role;
select * from finish();
rollback;
