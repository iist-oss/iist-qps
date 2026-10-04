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
- [x] S1 Analyse original IQPS
- [x] S2 Repo skeleton, AI context/log system
- [x] S3 Review of S2 SQL: fixed 2 bugs (empty prefix query crash; users could preset approved_by)

## Build queue (each item = one session; acceptance criteria in brackets)

### B1 Database (mostly written)
- [~] 0001 schema/RLS/search, 0002 storage, 0003 settings + domain restriction + upload cap  (session 9: applied by CI on the real Supabase local stack; production project not yet applied)
- [~] seed.sql, pgTAP tests (20 assertions, pass locally via `tools/local-db-test/run.sh`), CI workflow `db-tests.yml`
- [ ] Fix whatever CI reports  [CI green]

### B2 Edge Functions (Deno/TypeScript)
- [~] `approve-paper`: admin-only; update row, move file unapproved->approved, set file_path; if move fails revert row
- [~] `delete-paper`: admin-only; soft delete (flag) and hard delete (row + storage object)
- [~] `notify-upload`: DB webhook -> email to all admins (Gmail SMTP) + optional Slack (no-op if secrets unset)
- [~] Shared helpers `_shared/` (auth, cors, validate, trash) – validate logic verified under Node; rest UNTESTED
- [~] Migration 0004 `admin_apply_edit` (transactional edit) + pgTAP test `admin_edit.test.sql`
- [~] CI `functions-check.yml` (deno check + deno test); API contract in docs/EDGE_FUNCTIONS.md
  [deno check passes in CI; manual test script in docs/TEST_CHECKLIST.md]

### B3 Frontend core (Vite+React+TS)
- [~] Scaffold, relative `base` + HashRouter, SCSS, `src/config/university.ts` (name, colours, regexes, exam/semester lists, email domain hint)
- [~] `src/api/` wrappers: searchPapers, getStats, publicFileUrl done; upload/admin wrappers come in B4/B5
- [~] Search page: query, exam filter, year filter, sort, shareable URL, stats banner
- [~] Auth: Google sign-in, session hook, sign-out, admin flag from `admins` table
  [tsc + vite build green in CI]  (pure-logic modules typechecked + 6 node tests pass locally; React/Supabase code UNTESTED)
- [~] CI `frontend-ci.yml` (npm test + build); no package-lock.json yet (sandbox has no network)

### B3b Email OTP login (D21)
- [~] Migration 0006 `email_domain_ok` + pgTAP `email_check.test.sql` (3)
- [x] `/login` page (email -> 6-digit code, resend cooldown), AuthContext `sendCode`/`verifyCode`, `lib/email.ts` + tests  (user confirmed real OTP login works, 2026-10-04)
- [ ] Optional: Cloudflare Turnstile captcha to stop scripted code-request floods

### B4 Upload + OCR
- [~] Drag/drop + "Choose PDF files" button, per-file status (never abort batch), 100 MiB (0007) + PDF checks (extension/type, size, `%PDF-` header)  (session 14)
- [~] Autofill: filename first, then first-page text (pdf.js) or OCR (tesseract.js) for scans; config regex; Autumn/Monsoon -> odd, Spring -> even (D12)  [pure logic tested: 23 node tests pass; browser OCR UNTESTED]
- [~] Details edited inline on each file card (no modal, so the old hooks-in-`if` bug cannot occur) (D23)
- [~] Upload = Storage upload to `unapproved/<uid>/<uuid>.pdf`, then insert row; storage object removed if the insert fails
- [ ] Real-world test on production: upload a text PDF and a scanned PDF; check the admin email arrives (notify-upload)

### B5 Admin
- [ ] Review queue, edit+approve modal, similar-paper detection (query by course/year/sem/exam), replace option
- [ ] Soft delete with 8 s undo, trash page with hard delete
- [ ] Route guard (UI only; real security is RLS)

### B6 Deploy
- [~] `deploy-pages.yml` (build + publish), `ci.yml` = existing frontend-ci/db-tests/functions-check
- [~] `deploy-functions.yml` (needs secret SUPABASE_ACCESS_TOKEN; skips cleanly without it)
- [~] `keepalive.yml` cron (prevents free-tier pause)
- [ ] 404.html / base-path checks

### B7 Import tools (default: generic)
- [ ] `tools/import/` Node script: manifest (JSON/CSV) + folder of PDFs -> SHA-256 dedupe -> upload -> insert as library papers; dry-run mode
- [ ] Source-specific scraper only when Q2 is answered

### B8 Polish
- [ ] Mobile pass, a11y pass, privacy/takedown page, `docs/TEST_CHECKLIST.md`, maintainer README

## Definition of done
Student searches anonymously; signs in; uploads a PDF; admin approves; paper appears in
search; everything deploys from `main`; CI green.
