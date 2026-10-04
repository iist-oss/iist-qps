# Decisions (ADR-lite). Append only.

## D1 – Serverless stack (2026-10-04)
GitHub Pages + Supabase. Reason: user requirement, zero server cost/ops.
Consequence: security lives in RLS + SQL functions + Edge Functions.

## D2 – Login required for upload (2026-10-04)
Original IQPS allowed anonymous uploads. We require auth to limit abuse. Search stays public.

## D3 – Two buckets (2026-10-04)
`unapproved` private, `approved` public. Approval = move file via Edge Function.

## D4 – Store `file_path` not full URL (2026-10-04)
Same slug idea as IQPS; frontend builds the public URL. Lets us move storage later (e.g. R2).

## D5 – HashRouter for Pages (2026-10-04)
GitHub Pages has no SPA fallback; HashRouter avoids 404s on deep links.

## D6 – Default university config (2026-10-04) – assumption until Q1 answered
Name "Campus QPS". All branding in `frontend/src/config/university.ts`.

## D7 – Default course-code regex (assumption until Q3)
`[A-Za-z]{2,4}\s?-?\d{3,5}`, normalised to uppercase without spaces. Configurable.

## D8 – Default login (assumption until Q4)
Google OAuth. Optional restriction via `app_settings.allowed_email_domain` (empty = any Google account), enforced in RLS (migration 0003), not just UI.

## D9 – Default exam/semester vocabulary (assumption until Q5)
exam: midsem | endsem | ct | ctN; semester: odd | even (superseded by D12 wording). Changing this needs a migration (CHECK constraints) + config edit.

## D10 – Upload cap
20 uploads per user per rolling 24 h, stored in `app_settings.daily_upload_cap`; admins exempt.

## D11 – CI is the test runner (2026-10-04)
Sandbox cannot run Postgres/npm; GitHub Actions does. Nothing is [x] without green CI.

## D12 – Semesters are `odd` and `even` (2026-10-04, user decision)
Replaces autumn/spring everywhere (DB CHECK constraint, seed, UI labels, API).
Edited migration 0001 in place because it had never been applied; once applied anywhere, changes need a new migration.
OCR/filename autofill (B4): when a PDF says "Autumn" or "Spring", map Autumn -> odd and Spring -> even (and "Monsoon" -> odd), and also recognise the words "odd"/"even" directly. Mapping lives in `src/config/university.ts`.
Display labels (e.g. "Odd Semester (Jul–Dec)") are config, not data.

## D13 – Edit logic split: files in Edge Function, DB in one SQL function (2026-10-04)
`admin_apply_edit` (service_role only) does metadata+approval+replace in one transaction; the function moves the file first and reverts the move if the DB step fails. Hard delete removes the row first, then the file (orphaned file is better than a dangling row).
## D14 – Library papers live in `approved` bucket regardless of approve_status
Unreviewed library imports are already public on the source site; visibility is by row flag. Uploaded papers are private until approved.

## D15 – Auth uses PKCE flow + HashRouter (2026-10-04)
Implicit flow puts tokens in `#...`, which collides with HashRouter. PKCE returns `?code=` in the query string. Redirect URL must be allow-listed in Supabase (USER_ACTIONS 13).
## D16 – npm (not pnpm), no lockfile yet (2026-10-04)
Sandbox has no network so `package-lock.json` could not be generated. First green CI run should commit it.
## D17 – Pure logic kept free of React/Supabase imports (2026-10-04)
`src/lib/papers.ts` is unit-testable under plain Node (`npm test`), which is the only frontend code verifiable in the sandbox.
## D18 – Unapplied migrations edited in place (2026-10-04, session 7)
0001-0003 were corrected in place (policy idempotency, path check, constraints) because they have never been applied anywhere. Rule from now on: the moment any database has run them, every change is a new migration.
## D19 – Trashed uploads are moved out of the public bucket (2026-10-04, session 7)
Soft delete / replace moves an uploaded paper's file to `unapproved/trash/<id>.pdf` and updates `file_path`. Library papers are exempt (D14); their takedown = hard delete.
## D20 – University email only: domain list + sign-up block (2026-10-04, session 11)
Allowed: `iist.ac.in` and `ug.iist.ac.in` (subdomains must be listed separately). Migration 0005 makes `allowed_email_domain` a comma-separated list, adds `allowed_extra_emails` (exact addresses, e.g. a bootstrap admin) and a BEFORE INSERT trigger on auth.users that refuses accounts outside the list. Existing users are unaffected. Google `hd` can hold one domain only, so the UI sends `hd=*` (Workspace accounts only); it is a hint, the DB is the lock. If a non-university person tries to sign in they see a generic "Database error saving new user" from Supabase.

## D21 – Login is an emailed one-time code, not Google (2026-10-04, session 12)
IIST mail is Zimbra, not Google, so Google OAuth is dropped. Flow: `/login` page -> email -> 6-digit code (`signInWithOtp` + `verifyOtp` type `email`). The client first asks `public.email_domain_ok(email)` (migration 0006, returns only true/false) so outsiders get a clear message and no email is sent; the sign-up trigger from 0005 stays the real lock. Needs custom SMTP in Supabase (built-in sender only mails team members and is heavily rate-limited), and BOTH the "Magic Link" and "Confirm signup" templates must show `{{ .Token }}`. Supersedes D8 (Google) and the redirect-URL need in D15 (PKCE kept, harmless).

## D22 – Admin notification = email from notify-upload (2026-10-04, session 13)
User skipped Slack and wants admins emailed. notify-upload now sends via Gmail SMTP (app password, port 465 because Supabase blocks 25/587) using denomailer; recipients = all rows in `admins` (emails read via auth admin API). Burst guard: skip if another unapproved paper was uploaded in the last 10 min. Slack kept as optional. A header badge with the pending count is still planned for B5.

## D23 – Upload page: inline editing, lazy OCR, required fields (2026-10-04, session 14)
Details are edited inline on each file's card, not in a modal. Required to upload: valid course code, year, exam. Course name, semester and note are optional (the admin completes name/semester when approving, D13 rules). Autofill order: filename, then PDF text of page 1 (pdf.js), then OCR (tesseract.js) only if the page has almost no text. Both libraries are lazy-loaded (dynamic import) so search stays light; pdf.js uses the `legacy` build for older Android WebViews and vite `build.target` is es2022. Tesseract downloads its English model from a CDN at runtime. OCR runs one file at a time. User may upload up to 10 files at once (config `maxUploadFiles`).

## D24 – Bad Supabase config must not ship silently (2026-10-05, session 16)
Outage cause: the `VITE_SUPABASE_URL` GitHub secret lacked `.supabase.co`, so every request failed ("Failed to fetch") while the site looked fine. Now: `vite.config.ts` fails the build (CI + deploy) if a non-empty URL/key is malformed, a wrong-project key, or a service_role/secret key; the app shows a banner on every page linking to `/#/status`. Empty values still only show the old "not configured" banner (so a fork without secrets can still build). Logic lives in `src/lib/diagnose.ts`.
