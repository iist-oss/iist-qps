# Maintainer guide (for whoever runs Campus QPS next)
**Stack:** React site on GitHub Pages + Supabase (database, login, file storage, Edge Functions). No server of our own.
**Contact / builder:** see the site's About pages. Takedown mail: iistqps@gmail.com.

## Everyday jobs
- **Approve papers:** site > Admin > Review queue. Preview the PDF, check the details, Approve. Look for names/roll numbers on the page; if there are any, do not approve. Many at once: tick "I checked the PDF" on each ready card (or "Tick all ready" after looking), then "Approve N ticked". Your own uploads are published at once when complete (tick box on the upload page).
- **Daily email:** one "N papers waiting" email at 20:00 IST (GitHub Actions > Daily digest). Needs the GitHub secret `WEBHOOK_SECRET` and the Supabase SMTP secrets. To pause all new uploads set `daily_upload_cap` to `0` in `app_settings`.
- **Add courses:** Admin > Courses, paste "CODE Name" lines. (Approving a paper adds its course by itself.)
- **Takedown:** docs/TAKEDOWN_PROCEDURE.md. Soft delete first, permanent delete if it is personal data or an owner claim.
- **Add many old papers:** tools/import/README.md.
- **Make someone an admin** (Supabase SQL editor, after they signed in once):
  `insert into public.admins (user_id) select id from auth.users where email = 'name@iist.ac.in';`

## Deploy
Push to `main` (Termux: `bash ~/campus-qps/tools/termux/push.sh`). GitHub Actions run the tests and publish the site and Edge Functions.
Database changes are files in `supabase/migrations/`; apply them in the Supabase SQL editor (the `docs/supabase-run-*.txt` files hold the latest). Never edit a migration that was already applied: add a new one.

## Secrets (GitHub > Settings > Secrets > Actions, and Supabase > Edge Functions > Secrets)
VITE_SUPABASE_URL (must end in .supabase.co), VITE_SUPABASE_ANON_KEY, SUPABASE_ACCESS_TOKEN, WEBHOOK_SECRET (same value as the function secret, for the digest); function secrets WEBHOOK_SECRET, SMTP_USER, SMTP_PASS, SITE_URL.
The service-role key and database password never go in the repo or in chat.

## When something breaks
1. Open `<site>/#/status` and tap Run checks (shows the real error).
2. GitHub > Actions: a red run shows the failing step.
3. Supabase > Edge Functions > Logs for approve/delete/email problems.
4. Supabase Free pauses an idle project after 7 days; the keepalive workflow prevents it. If paused, press Restore in the dashboard.

## Where things are
`docs/DECISIONS.md` (why), `docs/AI_LOG.md` (history), `docs/AUTOMATION_PLAN.md` (ideas), `docs/TEST_CHECKLIST.md`, `AI_CONTEXT.md` (technical summary).
