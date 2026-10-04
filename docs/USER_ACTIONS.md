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

## Added in session 6 (Frontend) – Google login setup
11. Google Cloud Console -> APIs & Services -> Credentials -> Create OAuth client ID (Web).
    Authorised redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`.
12. Supabase -> Authentication -> Providers -> Google: paste Client ID + Secret, enable.
13. Supabase -> Authentication -> URL Configuration:
    Site URL = `https://<you>.github.io/<repo>/`  and add the same + `http://localhost:5173/` to Redirect URLs.
14. (DONE via migration 0005 + settings, see DECISIONS D20) restrict to your university: `update public.app_settings set value='university.edu' where key='allowed_email_domain';`
    and set `allowedEmailDomain` in `frontend/src/config/university.ts` (adds the Google account-chooser hint).
15. (SKIP – user tests on production, no local dev) Local dev: `cd frontend && cp .env.example .env.local`, fill in the URL + anon key, `npm install && npm run dev`.
