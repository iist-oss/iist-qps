-- pgTAP: public.email_domain_ok (migration 0006)
begin;
select plan(3);
update public.app_settings set value = 'iist.ac.in,ug.iist.ac.in' where key = 'allowed_email_domain';
update public.app_settings set value = '' where key = 'allowed_extra_emails';
select is(public.email_domain_ok('a@iist.ac.in'), true, 'iist allowed');
select is(public.email_domain_ok('a@ug.iist.ac.in'), true, 'ug.iist allowed');
select is(public.email_domain_ok('a@gmail.com'), false, 'gmail refused');
select * from finish();
rollback;
