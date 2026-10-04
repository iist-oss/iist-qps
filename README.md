# Campus QPS

A question-paper search site for the Indian Institute of Space Science and Technology. Students search old exam papers without an account, sign in with a university email to upload new ones, and admins review and approve uploads before they go public.

**Final release: 5 October 2026.** See [Project status](#project-status) before you rely on this.

Created by Maloth Harsha (SC26BTECH), Indian Institute of Space Science and Technology, 2026.

---

## Project status

**This project is no longer maintained by its author.** There will be no further updates, bug fixes or support from him. This repository is the final release.

- You are welcome to **fork it and run or improve your own copy**. If you want to take it over, change every item in [Things to change when you fork](#things-to-change-when-you-fork) first.
- No licence file is included. Until the owner adds one, others have no formal permission to reuse the code. If you want it forked freely, add a `LICENSE`.
- The contact address shown on the site's Takedown page may stop being monitored. Whoever runs the site must keep that address (or replace it) so removal requests are still answered.
- **Tests were removed in this release** to keep only what the app needs to run. This cleaned-up version has not been built or run end to end. The last full tested version is the one the cleanup started from (`campus-qps-s32.zip`), if you still have it.

---

## What it does

- **Search** approved papers by course code or name (typo-tolerant), filter by exam type, share a link to a result.
- **Upload** PDFs (up to 10 at a time). Course, year, exam and semester are pre-filled from the PDF by OCR in the browser.
- **Admin** area: review queue, bulk approve, similar-paper detection with a "replace" option, approved list, course catalogue editor, trash with restore, and an 8-second undo on delete.
- **Safety**: sign-in is limited to university email addresses, uploads are capped per user per day, and uploaded files stay private until an admin approves them.

---

## Architecture

No custom server. Everything runs on free tiers.

| Part | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, SCSS. Hosted on **GitHub Pages**. HashRouter, so it works on any Pages path. |
| Database, auth, storage | **Supabase** (Postgres, email one-time-code login, Storage, row-level security) |
| Server logic | 4 Supabase **Edge Functions** (Deno) |
| OCR | `pdfjs-dist` and `tesseract.js`, in the user's browser |
| Automation | GitHub Actions |

### Repository layout

```
frontend/                 the website
  src/pages/              Search, Upload, Admin, Login, Status, About, Credits, Takedown
  src/components/         Header, Stats, SearchResults, ReviewCard
  src/api/                calls to Supabase (papers, upload, admin, courses)
  src/lib/                pure helpers (autofill, upload rules, email, OCR, diagnose)
  src/config/             university.ts (all site-specific settings), courses.ts (fallback catalogue)
  public/                 404.html (Pages fallback), logo.svg
supabase/
  migrations/             0001 to 0012, applied in order
  functions/              approve-paper, delete-paper, notify-upload, daily-digest, _shared/
  config.toml             Supabase project config
.github/workflows/        deploy-pages, deploy-functions, digest, keepalive
```

### Database

Defined by `supabase/migrations/`. Never edit an applied migration; add a new one.

- `papers`: course code and name, year, exam (`''`, `midsem`, `endsem`, `lab`, `assignment`, `ct`, `ct1`, `ct2` ...), semester (`''`, `odd`, `even`), note, `file_path` (`<bucket>/<path>`), `approve_status`, `is_deleted`, `uploaded_by`, a generated full-text column.
- `courses`: code, name, source, `sem_no` (curriculum semester 1 to 12, used to pre-fill odd/even). It fills itself when papers are approved, and admins can paste lists in. Seeded with Semester 1 only.
- `admins`: user ids with admin rights.
- `app_settings` (admins only): `daily_upload_cap` (default 20), `allowed_email_domain` (comma-separated), `allowed_extra_emails` (exact addresses allowed in addition, such as a bootstrap admin).
- Functions: `search_papers` (combines trigram, full-text and prefix ranking), `get_stats`, `is_admin`, `email_allowed`, `email_in_allowed_list`, `email_domain_ok`, `admin_apply_edit` (service role only).
- Storage: `unapproved` (private) and `approved` (public) buckets, PDF only, **47 MiB** per file (migration 0009, just under the 50 MB Supabase Free cap). Users can only upload to `unapproved/<their user id>/`. Trashed uploads are moved to `unapproved/trash/<id>.pdf` so they stop being publicly downloadable.

Migrations 0007 to 0009 change the file-size limit three times. They are history, not mistakes; keep them.

### Edge Functions

| Function | Who calls it | What it does |
|---|---|---|
| `approve-paper` | Admin UI | Edits details, moves the PDF between buckets, applies the change in one database transaction, reverts the file move if that fails. |
| `delete-paper` | Admin UI | `soft` (trash), `restore`, `hard` (permanent, trash only). Up to 100 ids; returns one result per id and never aborts the batch. |
| `notify-upload` | Database webhook on `papers` INSERT | Emails admins about a new upload. Only the first upload of a 10-minute burst sends an email. |
| `daily-digest` | `digest.yml` workflow | One email to admins when papers are waiting. Sends nothing when the queue is empty. |

`approve-paper` and `delete-paper` check the caller's login and that they are in `admins`. `notify-upload` and `daily-digest` have JWT checks off and are protected by the `x-webhook-secret` header instead.

### Workflows

- `deploy-pages.yml`: builds the site and publishes it to GitHub Pages on every push to `main` that touches `frontend/`.
- `deploy-functions.yml`: deploys the four Edge Functions. Skips quietly if `SUPABASE_ACCESS_TOKEN` is not set.
- `digest.yml`: calls `daily-digest` every day at 14:30 UTC (20:00 IST). Skips quietly if secrets are missing.
- `keepalive.yml`: pings the database every Monday and Thursday so the free tier does not pause it.

---

## Setting up your own copy

You need a GitHub account and a free Supabase account.

1. **Fork or copy the repo** to your GitHub account.
2. **Create a Supabase project.** Note the project URL, the project ref, and the anon (public) key.
3. **Apply the database.** With the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`. This runs all 12 migrations.
4. **Allowed emails.** In `app_settings`, set `allowed_email_domain` to your university domain(s), for example `iist.ac.in,ug.iist.ac.in`. A subdomain must be listed on its own. Empty means anyone can sign up.
5. **Login emails.** The site signs people in with a one-time code sent by email. In Supabase, Authentication, Email Templates, make sure the template shows the code (`{{ .Token }}`), not only a link. Supabase's built-in mail sender is heavily rate-limited, so for real use configure your own SMTP under Authentication settings.
6. **Make the first admin.** Sign in once on the site, then in the Supabase SQL editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@your-university.edu';
   ```
   If your own address is not on the allowed domain, add it to `allowed_extra_emails` first.
7. **Edge Function secrets** (Supabase, Edge Functions, Secrets):
   - `WEBHOOK_SECRET`: a long random string
   - `SMTP_USER`, `SMTP_PASS`: a Gmail address and app password (Gmail over port 465). Optional: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`
   - `SITE_URL`: your site address, used for the review link in emails
   - `NOTIFY_MODE=digest` (optional): turns off the per-upload email and relies on the daily digest
8. **Database webhook.** In Supabase, Database, Webhooks, create one on `public.papers` for INSERT. Point it at `https://<ref>.supabase.co/functions/v1/notify-upload` and add the header `x-webhook-secret` with the same value as `WEBHOOK_SECRET`. This is configured in the dashboard, not in a migration.
9. **GitHub secrets** (repo Settings, Secrets and variables, Actions):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (both public by design; row-level security protects the data)
   - `SUPABASE_ACCESS_TOKEN` (to deploy functions)
   - `WEBHOOK_SECRET` (same value as above, for the digest)
10. **Turn on GitHub Pages**: repo Settings, Pages, Source = **GitHub Actions**.
11. **Deploy.** Push to `main`, or run the workflows by hand from the Actions tab. Open the site and visit `#/status` to check the connection.

**Never put the service-role key in the repo or in `VITE_` variables.** The site's `#/status` page and the build both warn if a secret key is used by mistake.

### Running locally

```
cd frontend
npm install
```

Create `frontend/.env.local`:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Then `npm run dev`. `npm run build` type-checks and produces `frontend/dist`. If the URL or key looks wrong the build stops with an explanation.

---

## Things to change when you fork

These are hard-coded for the original site:

| Where | What |
|---|---|
| `frontend/src/config/university.ts` | Site name, contact email, issues link, credits, repository link, allowed email domains, course-code pattern, upload limits. **Rewrite the credits and contact before publishing under your name.** |
| `.github/workflows/deploy-functions.yml` | `PROJECT_REF` is set to the original project. Change it to yours. |
| `frontend/src/config/courses.ts` and migration 0010 | Fallback and seeded course lists (Semester 1 only). |
| Course-code pattern | Appears in `university.ts`, `lib/upload.ts`, `lib/autofill.ts`, `supabase/functions/_shared/validate.ts` and migration 0010. Keep all of them in sync. |
| Allowed email domains | The login page text comes from `university.ts`; real enforcement is `app_settings.allowed_email_domain` in the database. Keep both in sync. |
| `public/404.html`, `index.html` | Site name and author meta tag. |

---

## Day-to-day operation

- **Approve papers**: sign in as admin, open Admin, Review queue. Check the details, then approve. Deleting moves a paper to Trash; Trash can restore or permanently delete.
- **Remove a paper on request**: Admin, Approved, delete it (this also makes its file private). Do this first and ask questions afterwards. Permanently delete from Trash if needed.
- **Change limits**: edit `app_settings` rows (`daily_upload_cap`, `allowed_email_domain`, `allowed_extra_emails`). The per-file size limit is in the storage buckets; changing it needs a new migration, and Supabase's project-wide upload limit also applies.
- **Add courses**: Admin, Courses, paste a list. Courses also appear on their own as papers are approved.
- **If the site "stops working"**: open `#/status`. Common causes are a paused free-tier project (restore it in the Supabase dashboard), a wrong or missing GitHub secret, or a missing Edge Function secret.

---

## Security model

- Row-level security is the real boundary. The anon key is public.
- Anyone can read approved, non-deleted papers. Users can read their own uploads. Admins can do everything.
- Users can only insert unapproved rows that point at their own folder, and only if their email is allowed.
- A user can remove their own uploaded file only while no database row points at it (this lets a failed upload clean itself up).
- A database trigger blocks sign-up for non-allowed email addresses and another enforces the daily upload cap.
- `app_settings` is readable by admins only (migration 0011).
- CORS on the Edge Functions is `*`. Tighten it to your site's address in `supabase/functions/_shared/cors.ts` if you want.

## Privacy

Searching needs no account and stores nothing. Signing in stores the email and who uploaded what and when, visible to admins only. Uploaded PDFs are private until approved and public afterwards. There are no ads, trackers or analytics. The in-app Takedown & privacy page states this to users; keep it accurate if you change behaviour.

## Known limitations

- Free-tier limits apply: 50 MB maximum per file project-wide, Gmail sending limits for emails, and database pausing after inactivity (the keepalive workflow mitigates this).
- OCR autofill is best-effort and works best on clean, text-based PDFs. Admins should always check details before approving.
- Only Semester 1 B.Tech courses are seeded. Others are learned from approved papers.
- There is no automated test suite in this release.
- Some comments at the top of early migrations (such as "not yet run on Supabase") are out of date. The migrations themselves were applied in production.

---

Created by Maloth Harsha (SC26BTECH), Indian Institute of Space Science and Technology, 2026. https://github.com/harsha-maloth
