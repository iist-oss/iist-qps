# AI_CONTEXT – read me first

## Goal
A "question paper search" web app for **<UNIVERSITY NAME – see OPEN_QUESTIONS Q1>**:
students search old exam papers, upload new ones; admins review/approve.
Inspired by IIT Kharagpur's IQPS (github.com/metakgp/iqps-go). We do NOT copy its
server; we re-implement on a serverless stack.

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
Table `papers`: id, course_code, course_name, year, exam ('' | midsem | endsem | ct | ctN),
semester ('' | odd | even), note, file_path, from_library, file_hash, uploaded_by,
upload_timestamp, approve_status, approved_by, is_deleted, fts (generated tsvector).
Table `admins`: user_id. Table `app_settings` (daily_upload_cap, allowed_email_domain).
Edge Functions: approve-paper, delete-paper, notify-upload (contract: docs/EDGE_FUNCTIONS.md). file_path = "<bucket>/<path>".
Functions: `is_admin()`, `email_allowed()`, `email_in_allowed_list()`, RPCs `search_papers`, `get_stats`, `email_domain_ok`. Trigger: upload cap.
Frontend: frontend/ (Vite, HashRouter, email-OTP login (D21), config in src/config/university.ts, pure helpers in src/lib/papers.ts, `npm test`).
Tests: `supabase/tests/*.sql` (pgTAP), run in CI. See PLAN.md 'Verification strategy'.
Buckets: `unapproved` (private), `approved` (public). PDFs only, 10 MiB max. Users may only insert rows whose `file_path` is `unapproved/<their uid>/...`; trashed uploads live in `unapproved/trash/<id>.pdf`.
Local SQL check without Supabase: `tools/local-db-test/run.sh` (plain Postgres + stubs + pgTAP shim).

## Lessons carried over from the original IQPS (do not repeat these)
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

## Reusable pieces from the original frontend
Search page (filters/sort/share-link), upload flow with OCR autofill
(`extractDetailsFromText` regexes: course code `[A-Z]{2}\d{5}`, exam, semester, year,
slot/supplementary note), admin dashboard (approve queue, similar-paper detection,
replace option, 8s undo-delete), trash page. Course list lives in a JSON map code->name.
University course codes may differ -> regexes must be made configurable (see Q3).

## Conventions
- Migrations: `supabase/migrations/NNNN_name.sql`, idempotent where possible.
- Never edit an applied migration; add a new one.
- Frontend env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only (anon key is public;
  RLS is the security boundary).
- Commit style: `type(scope): message`.
- Status honesty: mark anything not actually run/tested as "UNTESTED" in the log.

## User preference (see docs/LOCAL_SETUP.md)
Never ask the user to run local tests/dev servers; they test on production. Verify via CI and the sandbox; keep Termux instructions to one short command at a time.
