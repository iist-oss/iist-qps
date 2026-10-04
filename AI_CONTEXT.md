# AI_CONTEXT – read me first

## Goal
A "question paper search" web app for **IIST** (site name: Campus QPS):
students search old exam papers, upload new ones; admins review/approve.
Built on a serverless stack (no custom server).

## Stack (fixed – see DECISIONS D1)
- Frontend: React 18 + TypeScript + Vite + SCSS, hosted on **GitHub Pages**
- Backend: **Supabase** (Postgres, Auth, Storage, Edge Functions, RLS)
- No custom server. No Docker. No Rust.
- OCR autofill on upload runs in the browser (pdf.js + tesseract.js)

## Who does what
- The AI writes all code, SQL, workflows and docs and keeps the logs current.
- The user does only the one-time account actions in `docs/USER_ACTIONS.md`.
- The AI cannot reach the user's Supabase/GitHub accounts; it works through files in
  this repo, and the user applies them (or gives the AI a CLI-capable environment).

## Data model (summary; truth is `supabase/migrations/`)
Table `papers`: id, course_code, course_name, year, exam ('' | midsem | endsem | lab | assignment | ct | ctN),
semester ('' | odd | even), note, file_path, from_library, file_hash, uploaded_by,
upload_timestamp, approve_status, approved_by, is_deleted, fts (generated tsvector).
Table `courses` (code, name, source, sem_no; migrations 0010 + 0012, public read, admin write, filled by an approval trigger; sem_no = curriculum semester 1..12, used to pre-fill odd/even). Table `admins`: user_id. Table `app_settings` (daily_upload_cap, allowed_email_domain).
Edge Functions: approve-paper, delete-paper, notify-upload, daily-digest (contract: docs/EDGE_FUNCTIONS.md). file_path = "<bucket>/<path>".
Functions: `is_admin()`, `email_allowed()`, `email_in_allowed_list()`, RPCs `search_papers`, `get_stats`, `email_domain_ok`. Trigger: upload cap.
Frontend: frontend/ (Vite, HashRouter, email-OTP login (D21), upload page with PDF autofill (D23), config in src/config/university.ts, pure helpers in src/lib/{papers,email,autofill,upload}.ts, `npm test`).
Tests: `supabase/tests/*.sql` (pgTAP), run in CI. See PLAN.md 'Verification strategy'.
Buckets: `unapproved` (private), `approved` (public). PDFs only, 47 MiB max (migration 0009; just under the Supabase Free plan 50 MB project-wide maximum). Users may only insert rows whose `file_path` is `unapproved/<their uid>/...`; trashed uploads live in `unapproved/trash/<id>.pdf`.
Local SQL check without Supabase: `tools/local-db-test/run.sh` (plain Postgres + stubs + pgTAP shim).

## Lessons from earlier question-paper projects (do not repeat these)
1. Open, unauthenticated upload endpoint, content-type trusted from client -> we require
   login, enforce MIME + size in the bucket, and cap uploads per user per day.
2. Delete/hard-delete/edit touched DB and disk separately -> inconsistent states. We do
   DB changes in one SQL function/transaction, and file moves in one Edge Function that
   rolls back on failure.
3. SQL built with format!() -> we use parameterised SQL functions only.
4. Upload loop aborted the whole batch on one error -> per-file results, never abort.
5. Crawler deleted PDFs before download, never detected class tests -> rewrite, don't port.
6. React hook called inside an `if` in PaperEditModal -> fix when porting that component.
7. README required hand-running SQL -> we use migrations + a one-command setup script.
8. Search ranking = reciprocal-rank fusion of trigram (`%>>`), full-text, and prefix
   matching. Keep this; it works well.

## Frontend features (search, upload, admin)
Search page (filters/sort/share-link), upload flow with OCR autofill
(`extractDetailsFromText` regexes: course code `[A-Z]{2}\d{5}`, exam, semester, year,
slot/supplementary note), admin dashboard (approve queue, similar-paper detection,
replace option, 8s undo-delete), trash page. Course list lives in a JSON map code->name.
University course codes may differ -> regexes must be made configurable (see Q3).

## IIST specifics (D25)
Course codes: 2 letters + 3 digits + optional letter (MA111C). Catalogue: `frontend/src/config/courses.ts`. B.Tech semester 1 = odd (Jul-Dec).

## Conventions
- Migrations: `supabase/migrations/NNNN_name.sql`, idempotent where possible.
- Never edit an applied migration; add a new one.
- Frontend env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only (anon key is public;
  RLS is the security boundary).
- Commit style: `type(scope): message`.
- Status honesty: mark anything not actually run/tested as "UNTESTED" in the log.

## User preference (see docs/LOCAL_SETUP.md)
Never ask the user to run local tests/dev servers; they test on production. Verify via CI and the sandbox; keep Termux instructions to one short command at a time.
