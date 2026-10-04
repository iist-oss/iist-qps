-- pgTAP: several allowed domains + sign-up block (migration 0005).
begin;
select plan(9);

update public.app_settings set value = 'iist.ac.in, ug.iist.ac.in' where key = 'allowed_email_domain';
update public.app_settings set value = 'boot@gmail.com' where key = 'allowed_extra_emails';

select is(public.email_in_allowed_list('a@iist.ac.in'), true, 'main domain allowed');
select is(public.email_in_allowed_list('B@UG.IIST.AC.IN'), true, 'student subdomain allowed, case-insensitive');
select is(public.email_in_allowed_list('a@evil.iist.ac.in'), false, 'unlisted subdomain rejected');
select is(public.email_in_allowed_list('a@notiist.ac.in'), false, 'look-alike domain rejected');
select is(public.email_in_allowed_list('a@iist.ac.in.evil.com'), false, 'suffix trick rejected');
select is(public.email_in_allowed_list('boot@gmail.com'), true, 'extra exact address allowed');
select is(public.email_in_allowed_list('other@gmail.com'), false, 'other gmail rejected');

select lives_ok($$insert into auth.users (id, email, aud, role)
  values ('00000000-0000-0000-0000-0000000000c1','ok@ug.iist.ac.in','authenticated','authenticated')$$,
  'university sign-up allowed');
select throws_ok($$insert into auth.users (id, email, aud, role)
  values ('00000000-0000-0000-0000-0000000000c2','x@gmail.com','authenticated','authenticated')$$,
  'P0001', 'Sign-up is limited to university email addresses.', 'outside sign-up blocked');

select * from finish();
rollback;
