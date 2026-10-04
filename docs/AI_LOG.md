# AI LOG (append-only, newest at bottom)

## Entry template
### Session N – YYYY-MM-DD – short title
- **Did:** ...
- **Files touched:** ...
- **State left in:** (what works, what is UNTESTED)
- **Next step:** ...
- **Blockers / needs from user:** ...

---

### Session 1 – 2026-10-04 – Analyse original repo
- **Did:** Analysed an existing open-source question-paper search project and listed 11 issues (captured in AI_CONTEXT.md "Lessons").
- **Files touched:** none (analysis only)
- **State left in:** understanding complete
- **Next step:** plan the port
- **Blockers:** none

### Session 2 – 2026-10-04 – Plan + repo skeleton + log system
- **Did:** Chose stack mapping (DECISIONS D1–D5). Created CLAUDE.md, AI_CONTEXT.md, PLAN.md, USER_ACTIONS.md, OPEN_QUESTIONS.md, DECISIONS.md, this log. Drafted Phase 1 SQL (0001 schema/RLS/functions, 0002 storage).
- **Files touched:** all files in repo (initial commit)
- **State left in:** SQL is UNTESTED – no Postgres was available in the authoring sandbox, so it has never been executed. First thing next session: run it (local Postgres/Supabase CLI) and fix errors.
- **Next step:** Phase 1 remaining items (upload cap trigger, RLS tests, seed), then Phase 2
- **Blockers / needs from user:** answers to Q1–Q6, and USER_ACTIONS 1–2

### Session 3 – 2026-10-04 – Review, fixes, plan v2
- **Did:** Reviewed all of S2. Fixed two bugs in 0001 (search crashed on queries with no searchable terms because `to_tsquery(':*')` is invalid; students could insert rows with preset `approved_by`/`file_hash`). Added 0003 (app_settings, email-domain restriction in RLS, 24h upload cap trigger), seed.sql, pgTAP tests (9 assertions), `db-tests.yml`, minimal `supabase/config.toml`. Rewrote PLAN.md as v2 with a build queue B1–B8 and acceptance criteria; made open questions non-blocking via defaults D6–D11.
- **Files touched:** supabase/migrations/0001,0003; supabase/seed.sql; supabase/tests/rls.test.sql; supabase/config.toml; .github/workflows/db-tests.yml; docs/PLAN.md, DECISIONS.md, OPEN_QUESTIONS.md, AI_LOG.md; AI_CONTEXT.md
- **State left in:** ALL SQL, tests and workflow are UNTESTED (no Postgres/network in sandbox). Likeliest failure points: inserting into auth.users in the test fixture, storage.objects policy creation, config.toml completeness.
- **Next step:** B2 Edge Functions, then B3 frontend. If user pushes to GitHub and shares the CI log, fix B1 first.
- **Blockers / needs from user:** none to continue building. Nice to have: push repo so CI can validate; answers to Q1–Q6.

### Session 4 – 2026-10-04 – Semester vocabulary changed to odd/even
- **Did:** User chose `odd`/`even` instead of autumn/spring. Updated migration 0001 CHECK constraint, seed.sql, AI_CONTEXT, DECISIONS (new D12), PLAN (B4 OCR mapping note). Tests did not reference semester, so unchanged.
- **Files touched:** supabase/migrations/0001_schema.sql, supabase/seed.sql, AI_CONTEXT.md, docs/DECISIONS.md, docs/PLAN.md, docs/AI_LOG.md
- **State left in:** still UNTESTED (see session 3). Final grep shows no remaining autumn/spring in code/SQL.
- **Next step:** B2 Edge Functions, then B3 frontend (use `odd`/`even` in all types and the config file).
- **Blockers:** none

### Session 5 – 2026-10-04 – B2 Edge Functions
- **Did:** Wrote Edge Functions `approve-paper`, `delete-paper` (soft/restore/hard, per-id results), `notify-upload` (Slack via DB webhook, secret-authenticated); shared `_shared/{cors,auth,validate}.ts`; migration 0004 `admin_apply_edit` (transactional); pgTAP `admin_edit.test.sql`; Deno unit tests; CI `functions-check.yml`; config.toml `verify_jwt=false` for notify-upload; docs/EDGE_FUNCTIONS.md (API contract for frontend); USER_ACTIONS steps 7–10; decisions D13, D14.
- **Verified:** the pure logic in `validate.ts` (course code normalisation, odd/even, exam/ct, filename sanitising, slug split) was run under Node 22 with strip-types: all assertions passed. Deno is not installed here, so `deno check`/`deno test` themselves have NOT run.
- **UNTESTED:** all Edge Function handlers, `storage.move` with `destinationBucket` (needs a recent storage-js; if it errors in CI/real use, fall back to download+upload+remove), migration 0004, admin_edit pgTAP test, both CI workflows.
- **Files touched:** supabase/functions/**, supabase/migrations/0004_admin_edit.sql, supabase/tests/admin_edit.test.sql, supabase/config.toml, .github/workflows/functions-check.yml, docs/*, AI_CONTEXT.md
- **Next step:** B3 frontend core (Vite+React+TS scaffold, config file, api layer, search page, Google auth).
- **Blockers:** none.

### Session 6 – 2026-10-04 – B3 Frontend core
- **Did:** Scaffolded `frontend/` (Vite+React 18+TS, SCSS, HashRouter, relative base). Wrote: `config/university.ts`, `types.ts`, `lib/papers.ts` (pure helpers), `lib/supabase.ts` (PKCE), `api/papers.ts` (search_papers/get_stats RPC + public URL), `auth/AuthContext.tsx` (Google OAuth, admin flag), Header/Stats/SearchResults components, SearchPage (shareable URL, exam/year filters, sort), placeholder Upload/Admin pages, styles, `.env.example`, `frontend-ci.yml`, tests. Root `.gitignore`. USER_ACTIONS 11–15 (Google OAuth + redirect URLs). Decisions D15–D17.
- **Verified here:** `lib/papers.ts`, `types.ts`, `config/university.ts` pass `tsc --strict`; 6 node:test tests for lib pass.
- **UNTESTED:** everything importing React/Supabase/router (no node_modules, no network, so no `npm install`, no `tsc` on components, no `vite build`). Likeliest first-CI failures: a type mismatch in `.then(({data}) ...)` callbacks, `supabase.rpc` generic typing, react-icons names (all from `react-icons/fa`), missing lockfile. Fix those first.
- **Files touched:** frontend/**, .github/workflows/frontend-ci.yml, .gitignore, docs/*
- **Next step:** B4 Upload + OCR (pdf.js + tesseract.js, autofill using config regex + semester aliases, edit modal, Storage upload then row insert with rollback).
- **Blockers:** none.

### Session 7 – 2026-10-04 – Review + fixes, SQL actually executed
- **Did:** Full code review. For the first time ran the SQL: local Postgres 16 + pg_trgm, stubs for Supabase `auth`/`storage` schemas and a tiny pgTAP shim (`tools/local-db-test/`, run with `run.sh`). Migrations 0001-0004 apply and re-apply cleanly; search works (typo-tolerant, exam filter, junk query).
- **Bugs found and fixed:**
  1. `rls.test.sql` assumed an empty table but `supabase test db` runs after `seed.sql` -> tests 1-2 would fail in CI. Now starts with `delete from papers` (rolled back).
  2. `rls.test.sql` test 7 used a data-modifying `WITH` inside a subquery (invalid SQL). Rewritten.
  3. SECURITY: insert policy let a student set `file_path` to ANY path (e.g. someone else's approved file; approve-paper would then move/rename it). Policy now requires `unapproved/<own uid>/...`.
  4. Storage: email-domain restriction was not applied to file uploads; added. B4's "roll back the file if row insert fails" would have been refused (no delete policy); added `unapproved_owner_cleanup` (own file, only while no papers row references it).
  5. Policies were not re-runnable (`create policy` without `drop ... if exists`); fixed in 0001/0002/0003.
  6. Search prefix branch used `limit 30` without `order by`, which could drop the best matches; fixed.
  7. Added CHECK constraints: year 1950-2100, code <=20, name <=200, note <=200 chars.
  8. Edge: soft-deleting (or replacing) an uploaded paper left its PDF publicly downloadable in the `approved` bucket. New `_shared/trash.ts` moves it to `unapproved/trash/<id>.pdf` (reverted if the DB update fails). Used by delete-paper (soft) and approve-paper (replace).
- **Verified:** all of the above SQL + 20 test assertions (5 admin_edit, 15 rls) pass on real Postgres 16. `validate.ts` `trashPath` run under Node.
- **STILL UNTESTED:** Edge Function handlers incl. new trash.ts (no Deno; npm registry is blocked in the sandbox, so no `deno`, no `npm install`, no `tsc`/`vite build`); `storage.move` with `destinationBucket`; behaviour on real Supabase (grants, storage ownership, pgTAP availability); all frontend React code; all three CI workflows.
- **Edited applied migrations?** Edited 0001-0003 IN PLACE because nothing has been applied anywhere yet (see D18). After the first real apply, only add new migrations.
- **Known limitations (not fixed):** storage uploads are not covered by the daily cap (orphan-file spam possible, only a row insert is capped); bucket MIME check trusts the client Content-Type; search prefix branch uses the 'simple' config against an 'english' stemmed column (fuzzy branch compensates); unchecking all exam filters means "no filter"; library papers' files stay public after trash by design (D14), so a takedown of a library paper needs a hard delete.
- **Next step:** push to GitHub, read first CI run (fix B1/B2/B3 CI failures), commit package-lock.json; then B4.
- **Blockers:** none.

### Session 8 – 2026-10-04 – Termux setup + local-settings log
- **Did:** Added `docs/LOCAL_SETUP.md` (user's environment facts, workflow, troubleshooting, change log), `tools/termux/setup.sh` (installs git/gh/node, git config, GitHub login) and `tools/termux/push.sh` (unzip over repo, commit, push). CLAUDE.md now points to LOCAL_SETUP.md.
- **UNTESTED:** both scripts (no Termux/Android here); `bash -n` syntax check only.
- **Unknown, ask once and record:** Git name, GitHub username/email, repo name, Supabase project ref.
- **Next step:** user runs setup, pushes, sends CI result; then fix CI failures; then B4.

### Session 8b – 2026-10-04 – Recorded GitHub details
- **Did:** Filled docs/LOCAL_SETUP.md with user harsha-maloth, no-reply email, repo iist-oss/iist-qps; setup.sh defaults to them; push.sh adds the remote automatically on a fresh clone-less folder.
- **Next step:** user runs setup + first push, shares CI result.
- **Blockers:** none. Unconfirmed: repo visibility, Supabase ref, university name (Q1; org name suggests IIST).

### Session 8c – 2026-10-04 – Supabase URL recorded
- **Did:** Recorded project ref mebfxiizwzzsjuuqftoy in docs/LOCAL_SETUP.md.
- **State:** migrations/functions NOT yet applied to that project (not confirmed).
- **Next step:** user pushes repo, applies migrations (USER_ACTIONS 3), adds secrets.

### Session 8d – 2026-10-04 – Setup result + preference
- **Did:** Read the user's Termux transcript: tools installed, gh logged in as harsha-maloth. Recorded the 'no local tests, test on production' preference in LOCAL_SETUP.md, AI_CONTEXT.md; USER_ACTIONS 15 marked skip.
- **State:** first push to iist-oss/iist-qps NOT confirmed done.
- **Next step:** user runs push.sh, then applies migrations in the Supabase SQL editor.

### Session 8e – 2026-10-04 – First push confirmed
- **Did:** User pushed (511eda5). Cloned read-only: 57 files, no secrets. Repo is public. AI cannot read Actions logs (API 403 without push attach).
- **Next step:** user checks Actions tab / pastes failing logs; applies migrations in Supabase SQL editor.

### Session 9 – 2026-10-04 – First CI results
- **CI (run on 511eda5):** Frontend CI GREEN (tsc + vite build + 6 tests). Edge Functions check RED: TS2769 in delete-paper ids parsing (fixed: `new Set<number>(...)`). Database tests RED: log not yet seen.
- **Next step:** user pastes `gh run view <id> --log-failed | head -80` for Database tests; fix; re-push.

### Session 9b – 2026-10-04 – Database CI failure fixed
- **CI result (real Supabase local stack):** migrations 0001-0004 applied, admin_edit.test.sql 5/5 ok, rls.test.sql 13/15 ok. The two failures were in the test, not the schema: Supabase blocks raw `DELETE` on `storage.objects` (trigger `storage.protect_delete`) unless `storage.allow_delete_query = 'true'` (the Storage API sets it).
- **Fix:** rls.test.sql sets that flag before the two delete assertions; tools/local-db-test/stub.sql now mirrors the guard trigger so the failure reproduces locally (confirmed fail before, 15/15 after).
- **Now verified on real Supabase stack (via CI):** migrations apply, RLS/policy/cap/domain/path tests. Still unverified: deno test (blocked by the delete-paper type error, fixed in session 9), Edge Function runtime behaviour, storage.move across buckets, real Google login.
- **Next step:** push, confirm all 3 workflows green, then user applies migrations to the production project.

### Session 10 – 2026-10-04 – Production DB applied; deploy workflows
- **Did:** User ran migrations on production: success. Added deploy-pages.yml, deploy-functions.yml (supabase functions deploy --use-api; skips if no token), keepalive.yml.
- **UNTESTED:** all three new workflows; Pages must be enabled (Settings > Pages > Source: GitHub Actions) by an org admin.
- **Needs from user (in order):** GitHub secrets VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_ACCESS_TOKEN; Pages source; Google OAuth (USER_ACTIONS 11-13); sign in once; admin SQL (USER_ACTIONS 9).

### Session 11 – 2026-10-04 – University-only login
- **Did:** Migration 0005 (domain list, extra emails, sign-up trigger on auth.users), pgTAP email_domains.test.sql (9), frontend config `allowedEmailDomains` + `hd=*`, D20. Local run: 29 assertions green (5+9+15).
- **UNTESTED on real Supabase:** creating a trigger on auth.users from a migration (CI will show), and what the user sees when blocked. Frontend change small, verified only by CI.
- **Production steps for user:** run 0005 + the settings UPDATE in the SQL editor (file given in chat), then push the repo.
- **Risk:** if the admin's own Google account is not on an allowed domain they cannot sign up; fallback = set allowed_extra_emails to that address.

### Session 12 – 2026-10-04 – Email OTP login
- **Did:** Planned and implemented OTP login (D21). Found that the working folder ALREADY contained a parallel implementation written at 16:59 (migration 0006 `email_domain_ok`, pgTAP test, `lib/email.ts` + test, OTP `AuthContext`, `/login` route in App.tsx, university.ts comment). Kept it as the base. Added `pages/LoginPage.tsx` (email step, code step, resend cooldown 30 s, change email) and login-form styles. A LoginPage.tsx from that parallel work may have existed and was OVERWRITTEN by mine; its content is lost, so compare if something looks missing. Removed my own duplicate `lib/auth.ts` + test. Updated DECISIONS D21, PLAN B3b, USER_ACTIONS 11-13, AI_CONTEXT, LOCAL_SETUP.
- **Verified here:** 9 node tests pass (papers + email). Nothing else could run (no npm, no Postgres in this session).
- **UNTESTED:** `LoginPage.tsx` and all React code (no tsc/vite build here), migration 0006 + its pgTAP test, real email delivery.
- **Needs from user:** run 0006 in the SQL editor; enable Email provider; configure SMTP + edit both templates; test delivery (USER_ACTIONS 11-13).
- **Next step:** push, read CI, then B4 upload + OCR.

### Session 13 – 2026-10-04 – Admin email notification
- **Did:** User confirmed email OTP login works. Rewrote `notify-upload` to email all admins via Gmail SMTP (465) with a 10-minute burst guard; Slack optional. Updated EDGE_FUNCTIONS.md, DECISIONS D22. Marked B3b OTP login verified by user.
- **UNTESTED:** whole function (no Deno here): `deno check` of the denomailer import, SMTP over 465 from Supabase, auth.admin.getUserById. Nothing can trigger it until B4 (upload) exists.
- **Needs from user:** secrets WEBHOOK_SECRET, SMTP_USER, SMTP_PASS, SITE_URL; deploy functions (SUPABASE_ACCESS_TOKEN); create DB webhook on papers INSERT with header x-webhook-secret.
- **Next step:** B4 upload + OCR, then B5 admin (pending badge).

### Session 14 – 2026-10-04 – B4 Upload + autofill
- **Did:** User confirmed 10 files at a time. Built the upload page: `lib/autofill.ts` (course code / year / exam / semester / note detection, stop-word and year filtering), `lib/upload.ts` (form model, validation, file checks, `%PDF-` check, paths matching the RLS rule, friendly errors), `lib/ocr.ts` (pdf.js text, tesseract.js for scans, lazy-loaded), `api/upload.ts` (storage upload then row insert, removes the file if the insert fails), `pages/UploadPage.tsx` (drop zone + file picker, per-file cards with editable details, sequential OCR, per-file results), styles, deps `pdfjs-dist@4.10.38` + `tesseract.js@^5.1.1`, vite target es2022. Tests: `autofill.test.mts`, `upload.test.mts`.
- **Verified here:** 23 node tests pass (6 papers + 4 email + 13 new); `tsc --strict` passes on `autofill.ts` and `upload.ts`.
- **UNTESTED:** UploadPage.tsx, ocr.ts, api/upload.ts (no npm/network here: no tsc on React code, no vite build, no browser). Likeliest first-CI failures: pdfjs-dist import path/typing (`legacy/build/pdf.mjs`, worker `?url`), top-level-await build error (target already es2022), tesseract.js types. Runtime: real PDFs, scanned PDFs, tesseract model download, first real notify-upload email.
- **Not covered:** two users uploading the same PDF (file_hash stays null for uploads; admin similar-paper check comes in B5). Storage uploads are not covered by the daily cap (known limitation from session 7).
- **Next step:** push, read CI; user tests an upload on production; then B5 admin (review queue, approve with signed-URL preview, pending badge in header, trash).
- **Blockers:** none.

### Session 15 – 2026-10-05 – Production outage diagnosis: /status page
- **Symptom (user, live site):** home page shows "Serving … papers across … courses" (stats never load) and sign-in says "Something went wrong". Supabase project is Active; `https://<ref>.supabase.co/auth/v1/health` answers `No API key found in request` (project reachable). The "Supabase is not configured" banner is NOT shown, so URL and key are non-empty in the build. Cause still UNKNOWN (suspects: wrong/rotated key or key for another project, publishable-key format with supabase-js, network block).
- **Did:** Added `/#/status` (`pages/StatusPage.tsx`): prints URL, key shape (kind, length, first 6 chars, JWT role + project ref; never the full key), flags mismatches, runs 3 probes with the real apikey (auth health, auth settings, get_stats) and a "send test code" button that prints the raw Supabase error (status, name, message). Pure logic in `lib/diagnose.ts` + `tests/diagnose.test.mts` (4 tests). Fixed favicon path in `index.html` (`/logo.svg` -> `./logo.svg`, broke under the /iist-qps/ subpath).
- **Verified here:** 27 node tests pass (23 + 4); `tsc --strict` passes on `lib/diagnose.ts`.
- **UNTESTED:** StatusPage.tsx, App.tsx route, SCSS (no npm/vite here; CI will build).
- **Next step:** user pushes, opens https://iist-oss.github.io/iist-qps/#/status, taps "Run checks", sends a screenshot; fix per result. Then B5 admin.
- **Blockers:** the outage cause.

### Session 16 – 2026-10-05 – Outage fixed + config guard
- **Cause found via /status:** `VITE_SUPABASE_URL` secret was `https://mebfxiizwzzsjuuqftoy` (no `.supabase.co`). User corrected the secret and redeployed; /status now shows health 200, settings 200, get_stats 200 (0 papers).
- **Did:** D24 guard: `configProblems` in `lib/diagnose.ts` (+test), build-time check in `vite.config.ts`, banner in `App.tsx` via `configIssues` in `lib/supabase.ts`.
- **Verified here:** 28 node tests pass; `tsc --strict` on diagnose.ts. **UNTESTED:** vite.config.ts check, banner (CI builds them; CI uses a valid placeholder URL so it must stay green; if red, read the "Bad Supabase configuration" message).
- **Still unconfirmed:** real sign-in email delivery after the fix (user to try; else use /status "Send test code").
- **Next step:** B5 admin dashboard.

### Session 17 – 2026-10-05 – Real IIST papers as reference: course codes, catalogue, autofill
- **Input:** `PYQP_2024_Sem_1.pdf` (21.5 MB, 42 scanned pages = 21 papers, Sem 1 2024: MA111/MA111C, PH112C, CH112H, AV111C, ES111H, AE131/AV131 lab) + the Semester 1 course list.
- **Found (probe on real headers, before the fix):** autofill returned NO course code for MA111C/CH112H/PH112C and missed "End Terminal", "Test I", "I Semester"; `validateForm` rejected "MA111C" (blocking: students could not upload any suffixed code). Also: the file is > 10 MiB and is a bundle, so the upload page cannot take it as is.
- **Did:** D25. Code pattern with optional suffix in 4 synced places; `config/courses.ts` + `lib/courses.ts` (name pre-fill, wired into UploadPage at filename and PDF stages); autofill: end-term, Test I..V, dash separators, semester-by-number; placeholders/messages say MA111C. Open questions Q3 answered, Q7-Q9 added.
- **Verified here:** 40 node tests pass (28 + 12 new, using transcribed real headers); `tsc --strict` on all lib files + config/courses.ts; edge-function `validate.ts` assertions run under Node (Deno not available: `validate.test.ts` additions UNTESTED under deno).
- **UNTESTED:** UploadPage.tsx wiring (no tsc/vite here; CI builds it). Real OCR quality on these tilted phone-camera scans is unknown (tests use transcribed text, not OCR output). Nothing deployed yet.
- **Next step:** user pushes; decide Q7-Q9; then B5 admin (needs PDF preview before approve for the privacy case).

### Session 18 – 2026-10-05 – CI build red: placeholder key rejected by the D24 guard
- **CI result:** `npm run build` failed in vite.config.ts: "The key has an unexpected shape". Cause: frontend-ci.yml used `VITE_SUPABASE_ANON_KEY: ci-placeholder-key`, which the session 16 guard (correctly) rejects. Session 16 had only considered the placeholder URL.
- **Did:** CI now uses a fake anon-shaped JWT (role anon, ref `example`, matching `https://example.supabase.co`). Guard left strict. Checked with `configProblems`: new key -> no problems, old key -> the reported error.
- **UNTESTED:** the CI run itself. If the DEPLOY workflow (not CI) shows the same error, the real `VITE_SUPABASE_ANON_KEY` secret is malformed (quotes/spaces/truncated) and must be re-pasted.
- **Next step:** push, confirm green; then the Q7-Q9 decisions / B5 admin.

### Session 19 – 2026-10-05 – Lab/assignment types + 100 MiB limit (user decisions)
- **Did:** Migration 0007 (new exam CHECK allowing lab/assignment; bucket limits -> 104857600). Same two values added to `lib/upload.ts` (options + regex), `validate.ts`, `types.ts`, `lib/papers.ts` (filters, tags LAB/ASSIGN, tooltips), SearchPage labels; autofill fallback patterns (only if no real exam wording). `maxFileMiB` 10 -> 100. D26, Q7 answered, USER_ACTIONS 19-20, new pgTAP `lab_assignment.test.sql` (6).
- **Verified here:** 43 node tests pass; `tsc --strict` on lib files; real Postgres 16 run of all migrations + pgTAP shim: 38 assertions ok (5+3+9+6+15).
- **UNTESTED:** SearchPage/UploadPage rendering (CI builds), deno test addition, migration on real Supabase (CI), the 100 MiB path end to end (browser memory use of pdf.js/tesseract on very large scans unknown).
- **Caveat:** Supabase project-wide upload limit (Free = 50 MB) caps the effective size until changed/upgraded (USER_ACTIONS 20).
- **Next step:** user pushes, runs 0007 in SQL editor; PDF split (Q9) when the file is attached; then B5 admin.

### Session 20 – 2026-10-05 – B5 admin dashboard
- **Decision with user:** do NOT build automatic bundle splitting at upload now; split the user's own 21-paper PDF with a script instead (still waiting for the PDF to be attached), admin dashboard first.
- **Did:** `lib/admin.ts` (+`tests/admin.test.mts`, 6 tests), `api/admin.ts` (list, counts, signed URLs, approve-paper / delete-paper wrappers with readable errors), `components/ReviewCard.tsx`, `pages/AdminPage.tsx` (Review queue / Approved / Trash), header badge, styles. D27, PLAN B5 items.
- **Verified here:** 49 node tests pass; `tsc --strict` on the pure lib files. No React type-check possible here (npm registry blocked), so ReviewCard / AdminPage / Header / api/admin are **UNTESTED**; CI builds them. Likeliest CI failures: a typing nit in `api/admin.ts` (`functions.invoke` body type) or `react-hot-toast` custom toast typing.
- **Needs from user (not confirmed in any log):** Edge Functions deployed (`approve-paper`, `delete-paper`, `notify-upload`; needs SUPABASE_ACCESS_TOKEN secret), and the user's account added to `admins` (USER_ACTIONS 7-9). Without these the dashboard shows "Admins only" or errors on approve/delete.
- **Next step:** push, read CI; user approves one real test upload end to end; then split the PDF (Q9) and run Q8 (redaction) review in the dashboard.

### Session 21 – 2026-10-05 – 50 MiB limit; SQL as .txt
- **Did:** user asked for 50 (Free plan max). Migration 0008, `maxFileMiB` 50, tests/pgTAP/docs updated, D28. SQL for the SQL editor delivered as `supabase-run-0007-0008.txt` (phone cannot open .sql).
- **Verified here:** 49 node tests pass; all 8 migrations + 38 pgTAP assertions pass on local Postgres 16.

### Session 22 – 2026-10-05 – 47 MiB limit
- **Did:** user chose to lower the limit (D29). Migration 0009, `maxFileMiB` 47, tests/pgTAP/docs updated; SQL file now `docs/supabase-run-0007-0009.txt`.

### Session 23 – 2026-10-05 – PYQP_2024_Sem_1.pdf split (Q8, Q9)
- **Did:** OCR'd the 42 pages (tesseract) to find boundaries, checked ambiguous pages by eye, split with qpdf into 21 papers (MA111C x4, PH112C x4, CH112H x2, AA131V lab exercises x4, AV111C x4, ES111H x3). Blacked out the printed name + ID on the Physics class test page (image edited, original not included in that file; OCR of the output finds no name). Files are all < 3 MB so no recompression was needed. Filenames carry code, exam, year and `odd-semester`; checked with the app's own autofill + catalogue (all 21 resolve code, name, year, exam, semester; the unlabelled quiz has no exam). Autofill fix: a bare `_ct_` in a FILE NAME now means class test (not in paper text). 50 node tests pass.
- **Judgement calls to confirm:** "Test I - November 2024" filed as ct2; Physics class test filed as PH112C (no code printed); page 30 (transformer questions, no header) filed as an unlabelled AV111C paper; lab code AA131V (catalogue) although papers print AE131/AV131.
- **Delivered:** iist-sem1-2024-papers.zip (batch1/2/3 + README.txt).

### Session 24 – 2026-10-05 – First production test (batch 1)
- **User result:** all 6 steps done (push, CI, SQL, admin, one test, batch 1 uploaded). Admin page works; 4 lab papers (#3-#6) waiting and flagged each other as duplicates.
- **Did:** D30 (note autofill for "Exercise N", duplicate rule ignores differently-noted papers). 52 node tests pass; tsc --strict on lib files. UNTESTED: ReviewCard change (CI builds).
- **Existing rows #3-#6 have blank notes:** the admin types "Exercise N" in each card and uses "Save only", then Approves (check the PDF preview to see which exercise it is).
- **Open:** the 6 other batch-1 papers' status not stated by the user (assumed approved); batch 2/3 not yet uploaded; takedown page, branding (Q1).

### Session 25 – 2026-10-05 – Takedown/privacy page + builder credit
- **User decisions:** takedown contact = iistqps@gmail.com AND GitHub issues; keep the name Campus QPS, but the user (builder) wants their university to remember who built it.
- **Did:** `TakedownPage.tsx` (/#/takedown), `AboutPage.tsx` (/#/about), footer with links + "Built by", `university.contact` + `university.credits`, humans.txt, meta author, README credit, docs/TAKEDOWN_PROCEDURE.md, D31, `tests/config.test.mts`.
- **Verified here:** 54 node tests pass. UNTESTED: the two pages and footer (React; CI builds them).
- **To confirm with user:** full name shown (assumed "Harsha Maloth" from the GitHub handle); GitHub Issues enabled on the repo; the batch 2/3 and lab-card steps from session 24 are still pending on their side.
- **Next step:** user pushes; batches 2/3; optional LICENSE choice (copyright line with the builder's name).

### Session 26 – 2026-10-05 – Two About pages, reference project mentions removed
- **Did:** removed every mention of the earlier reference project from site, code comments and docs. Split About into `AboutPage` (the site) and `CreatorPage` (/#/creator, first person, text in `university.credits.message`). Footer links both; builder name links to /creator. D31 updated, config test extended.
- **Verified here:** node tests (see below). UNTESTED: React pages (CI builds).
- **Note:** the first-person text is my draft from known facts only; the user may rewrite it in config.

### Session 27 – 2026-10-05 – Build time on the builder page
- **Did:** user asked to show how long the build took. From this log: started 2026-10-04 (session 1), site + OTP login + upload done the same day (sessions 1-14), admin dashboard + first real papers on 2026-10-05 (sessions 15-24) = two days. Added `credits.timeline` / `buildSummary` and a "How long it took" section on /#/creator.
- **Correction:** my earlier first-person text said the user built it "to the last line of code"; the logs show the AI wrote the code, so it now says it was built together with Claude. The user can reword it in config.
- **Not known:** hours worked (logs have dates only).

### Session 28 – 2026-10-05 – Build time in hours
- **Did:** user asked to use time. Device time = 01:02 IST on 2026-10-05. File timestamps in the user's zip run 15:36 to 19:17 UTC on 2026-10-04 = 21:06 to 00:47 IST (consistent with the zip upload at 00:52 IST), i.e. about 3 h 40 min of file activity, about 4 h to now. This also explains the log dates: sessions 15-24 are after midnight IST. So session 27's "two days" was wrong in elapsed time (two calendar dates, one evening). Timeline and summary in `university.credits` rewritten with approximate IST times.
- **Caveat:** mtimes are not exact (analysis before the first file, waiting on CI/user steps are inside the span). Hence "about".

### Session 29 – 2026-10-05 – Automatic course catalogue
- **Did:** user asked to automate the catalogue. Migration 0010 (`courses` table, RLS, approval trigger, Semester 1 seed, backfill from approved papers), pgTAP `courses.test.sql` (10 assertions), `lib/courseList.ts` + 4 node tests, `api/courses.ts`, `pages/CoursesAdmin.tsx` (paste list, preview, save, filter, remove), Admin tab, UploadPage merges the DB list over the static one via a ref. D32. SQL for the phone: `docs/supabase-run-0010.txt`.
- **Verified here:** 58 node tests pass. UNTESTED: the SQL (no Postgres in this session; CI runs the pgTAP), all React code (CI builds). Likeliest CI nits: pgTAP `INSERT ... SELECT ... ORDER BY ... ON CONFLICT` parse, upsert typing in api/courses.ts.
- **Needs from user:** run `docs/supabase-run-0010.txt` (superseded in session 30 by `supabase-run-0010-0011.txt`) in the Supabase SQL editor BEFORE opening Admin > Courses (else it shows a "relation does not exist" error); push.
- **Next step:** user pastes the Semester 2+ course list into Admin > Courses.

### Session 30 – 2026-10-05 – Full review + automation plan
- **Did:** read all Edge Functions, migrations, workflows, auth, search, upload, admin code. Wrote `docs/AUTOMATION_PLAN.md` (findings + phases A-D). Fixed two things: migration 0011 (app_settings was world-readable, exposing `allowed_extra_emails`) + pgTAP `settings_private.test.sql` (4); admin ReviewCard now uses the live catalogue via new `lib/useCatalogue.ts` (shared with UploadPage; CoursesAdmin resets it after saving).
- **Verified here:** 58 node tests pass. UNTESTED: 0011 + its test (no Postgres here; CI runs pgTAP), the React edits (CI builds).
- **Needs from user:** run `docs/supabase-run-0010-0011.txt` in the SQL editor (replaces the 0010-only file), push. Then choose which phase to start (recommended: A).

### Session 31 – 2026-10-05 – Back to the original plan: B6, B7, B8
- **Did:** PLAN.md checkboxes brought in line with what the user has actually run in production. B6: `public/404.html` (redirects to the site root). B7: `tools/import/` (dependency-free Node importer: folder + optional CSV/JSON manifest, reuses the site's autofill/catalogue/validation, SHA-256 + similar-paper skips, rollback on failed insert, `--dry-run`, README) + `frontend/tests/import.test.mts` (5). `notify-upload` now ignores approved/library inserts so an import cannot send one email per paper. B8: `docs/TEST_CHECKLIST.md`, `docs/MAINTAINERS.md`, README links, a11y (aria-labels on result buttons and selects, visible focus ring, 44 px tap targets, result cards wrap on narrow screens, noscript text).
- **Verified here:** 63 node tests pass; the importer's dry run executed on dummy PDFs (complete, incomplete, fake PDF, junk name all reported correctly). UNTESTED: live import (Storage/REST calls, no network here), notify-upload edit (no Deno), the React/SCSS edits (CI builds), 404.html.
- **Not done (needs the user):** scanned-PDF + admin-email checks, phone pass, Turnstile.
- **Next step:** user pushes, runs the checklist; then Phase A of AUTOMATION_PLAN.
