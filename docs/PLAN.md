# PLAN v2 – build-ready (executed by the AI)

Legend: [ ] todo  [~] written but never executed  [x] done and verified
No step below waits on the user: unanswered questions use the defaults in DECISIONS D6–D10,
all of which live in ONE config file so they can be changed later in minutes.

## Verification strategy (important)
The authoring sandbox has NO network and NO Postgres, so it cannot run SQL, `npm install`,
or a build. Therefore: code is written carefully, and *GitHub Actions is the test runner*
(pgTAP for SQL, tsc + vite build for frontend). A step is only [x] after CI is green or the
user confirms it ran. Until then it stays [~]. Each session starts by asking for / reading
the latest CI result, if any, and fixing failures first.

## Done
- [x] S1 Analyse prior art
- [x] S2 Repo skeleton, AI context/log system
- [x] S3 Review of S2 SQL: fixed 2 bugs (empty prefix query crash; users could preset approved_by)

## Build queue (each item = one session; acceptance criteria in brackets)

### B1 Database (mostly written)
- [x] 0001-0009 schema/RLS/search/storage/settings/limits  (CI green; applied to production, user-confirmed)
- [x] seed.sql, pgTAP tests, CI workflow `db-tests.yml`
- [x] Fix whatever CI reports  [CI green]

### B2 Edge Functions (Deno/TypeScript)
- [x] `approve-paper` (used in production): admin-only; update row, move file unapproved->approved, set file_path; if move fails revert row
- [x] `delete-paper` (used in production): admin-only; soft delete (flag) and hard delete (row + storage object)
- [~] `notify-upload` (email on upload still to be confirmed by the user): DB webhook -> email to all admins (Gmail SMTP) + optional Slack (no-op if secrets unset)
- [~] Shared helpers `_shared/` (auth, cors, validate, trash) – validate logic verified under Node; rest UNTESTED
- [~] Migration 0004 `admin_apply_edit` (transactional edit) + pgTAP test `admin_edit.test.sql`
- [~] CI `functions-check.yml` (deno check + deno test); API contract in docs/EDGE_FUNCTIONS.md
  [deno check passes in CI; manual test script in docs/TEST_CHECKLIST.md]

### B3 Frontend core (Vite+React+TS)
- [x] Scaffold, relative `base` + HashRouter, SCSS, `src/config/university.ts` (name, colours, regexes, exam/semester lists, email domain hint)
- [x] `src/api/` wrappers: searchPapers, getStats, publicFileUrl done; upload/admin wrappers come in B4/B5
- [x] Search page: query, exam filter, year filter, sort, shareable URL, stats banner
- [x] Auth (now email-code login):, session hook, sign-out, admin flag from `admins` table
  [tsc + vite build green in CI]  (pure-logic modules typechecked + 6 node tests pass locally; React/Supabase code UNTESTED)
- [x] CI `frontend-ci.yml` (npm test + build); no package-lock.json yet (sandbox has no network)

### B3b Email OTP login (D21)
- [x] Migration 0006 `email_domain_ok` + pgTAP `email_check.test.sql` (3)
- [x] `/login` page (email -> 6-digit code, resend cooldown), AuthContext `sendCode`/`verifyCode`, `lib/email.ts` + tests  (user confirmed real OTP login works, 2026-10-04)
- [ ] Optional: Cloudflare Turnstile captcha to stop scripted code-request floods

### B4 Upload + OCR
- [x] Drag/drop + "Choose PDF files" button, per-file status (never abort batch), 47 MiB (0009) + PDF checks (extension/type, size, `%PDF-` header)  (session 14)
- [x] Autofill: filename first, then first-page text (pdf.js) or OCR (tesseract.js) for scans; config regex; Autumn/Monsoon -> odd, Spring -> even (D12)  [pure logic tested: 23 node tests pass; browser OCR UNTESTED]
- [x] Details edited inline on each file card (no modal, so the old hooks-in-`if` bug cannot occur) (D23)
- [x] Upload = Storage upload to `unapproved/<uid>/<uuid>.pdf`, then insert row; storage object removed if the insert fails
- [~] Real-world test on production: text PDFs done (batches 1-3); still to try: a scanned PDF, and the admin email (see docs/TEST_CHECKLIST.md)

### B5 Admin (session 20)
- [x] Review queue (oldest first) with PDF preview via signed URL (iframe + "open in new tab"), edit form, Approve / Save only, via `approve-paper`
- [x] Similar-paper detection (same course code + year + exam, semester equal or unknown) with "replace" tick boxes
- [x] Approved tab (edit, unapprove, delete = takedown), Trash tab (restore, permanent delete with confirm)
- [x] Soft delete with 8 s undo (delete is sent after the delay), pending-count badge in the header, UI route guard
  [pure logic `lib/admin.ts` tested: 6 node tests; React pages UNTESTED until CI builds and an admin uses them on production]

### B6 Deploy
- [x] `deploy-pages.yml` (build + publish), `ci.yml` = existing frontend-ci/db-tests/functions-check
- [x] `deploy-functions.yml` (needs secret SUPABASE_ACCESS_TOKEN; skips cleanly without it)
- [x] `keepalive.yml` cron (prevents free-tier pause)
- [~] 404.html added (session 31); base-path works (site is live under /iist-qps/)

### B7 Import tools (default: generic)
- [~] `tools/import/` Node script: manifest (JSON/CSV) + folder of PDFs -> SHA-256 dedupe -> upload -> insert as library papers; dry-run mode (session 31; dry run tested, live run UNTESTED)
- [ ] Source-specific scraper only when Q2 is answered (not needed: no library site)

### B7b Course catalogue (session 29)
- [~] Migration 0010 `courses` + approval trigger + pgTAP `courses.test.sql` (10); `api/courses.ts`, Admin > Courses tab, `lib/courseList.ts` (4 node tests), upload page merges DB list

### B7c Automation (see docs/AUTOMATION_PLAN.md)
- [ ] Phase A one-push release, C maintenance (C0, C2-C5), D import tool
- [~] 0011 settings private (session 30)
- [~] Phase B (session 32, solo admin, D33/D34): B1 admin publish-now, B2 bulk approve, B3 course semester number (migration 0012 + `Semester N` headings), C1 daily digest (`daily-digest` function + `digest.yml`). 70 node tests pass; React / SQL / Deno code UNTESTED until CI and production

### B8 Polish
- [x] privacy/takedown page + About/credits (session 25-27)
- [~] a11y pass (labels, focus ring, tap size; session 31, static only), mobile pass (layout wrap; needs the user's phone check)
- [x] `docs/TEST_CHECKLIST.md`, maintainer guide `docs/MAINTAINERS.md`
- [ ] Optional: Cloudflare Turnstile captcha (needs a Cloudflare account)

## Definition of done
Student searches anonymously; signs in; uploads a PDF; admin approves; paper appears in
search; everything deploys from `main`; CI green.
