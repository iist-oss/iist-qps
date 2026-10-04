# One-time actions only the user can do
(The AI cannot access your accounts. Each item says what to send back.)

1. Create a GitHub repo and push this folder to it.        -> tell the AI the repo URL
2. Create a free Supabase project (supabase.com).          -> tell the AI the project ref
3. In the Supabase SQL editor run migrations in order (or `supabase db push`).
4. Add GitHub repo secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   (Never share or commit the service_role key.)
5. GitHub repo -> Settings -> Pages -> Source: "GitHub Actions".
6. Answer docs/OPEN_QUESTIONS.md.

After this, just say "continue" – the AI reads CLAUDE.md and picks up from AI_LOG.md.

## Added in session 5 (Edge Functions) – do after step 3 above
7. Deploy functions:  `supabase functions deploy approve-paper delete-paper notify-upload`
8. Set secrets:       `supabase secrets set WEBHOOK_SECRET=<long random string> SITE_URL=https://<you>.github.io/<repo>` (+ `SLACK_WEBHOOK_URL=...` if wanted)
9. Make yourself admin (SQL editor, after you have signed in once):
   `insert into public.admins (user_id) select id from auth.users where email = 'you@university.edu';`
10. (Optional, for Slack) Dashboard -> Database -> Webhooks -> create: table `papers`, event INSERT,
    type "Supabase Edge Functions" -> `notify-upload`, add header `x-webhook-secret` = same value as step 8.

## Login setup (session 12, replaces the Google steps 11-13; see DECISIONS D21)
11. Run `supabase/migrations/0006_email_check.sql` in the Supabase SQL editor.
12. Supabase -> Authentication -> Providers: enable **Email**, disable Google. OTP length 6, expiry about 10 min.
13. Supabase -> Authentication -> SMTP: add a custom SMTP sender (IIST IT relay if possible, else Brevo free tier, else a Gmail app password).
    Then edit the **"Magic Link"** and **"Confirm signup"** email templates to show the code: `Your code: {{ .Token }}`.
    (Authentication -> URL Configuration: set Site URL to `https://iist-oss.github.io/iist-qps/`.)
    Test: request a code for one @iist.ac.in and one @ug.iist.ac.in address; check spam; ask IT to whitelist the sender if needed.
14. (DONE via migration 0005 + settings, see DECISIONS D20) restrict to your university: `update public.app_settings set value='university.edu' where key='allowed_email_domain';`
    and set `allowedEmailDomain` in `frontend/src/config/university.ts` (adds the Google account-chooser hint).
15. (SKIP – user tests on production, no local dev) Local dev: `cd frontend && cp .env.example .env.local`, fill in the URL + anon key, `npm install && npm run dev`.

## Admin email on new upload (session 13, optional)
16. Supabase -> Edge Functions -> Secrets: add `WEBHOOK_SECRET` (long random), `SMTP_USER` (the Gmail address), `SMTP_PASS` (the Gmail app password), `SITE_URL` (https://iist-oss.github.io/iist-qps).
17. Make sure `notify-upload` is deployed (needs the SUPABASE_ACCESS_TOKEN GitHub secret).
18. Database -> Webhooks -> create: table `papers`, event Insert, type Supabase Edge Functions -> `notify-upload`, POST, header `x-webhook-secret` = the same value as step 16.

## Session 19-21 – lab/assignment types and 47 MiB (D26, D29)
19. Run the SQL in `supabase-run-0007-0009.txt` (same as migrations 0007 + 0008 + 0009) in the Supabase SQL editor (production; CI only tests it). Safe to run twice.
20. Supabase Dashboard -> Storage -> Settings -> "Upload file size limit": make sure it is 50 MB (the Free plan maximum; our files are capped at 47 MiB).

## Session 29-30 – course catalogue + privacy fix
21. Run the SQL in `supabase-run-0010-0011.txt` (migrations 0010 + 0011) in the Supabase SQL editor. Safe to run twice.
