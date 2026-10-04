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
- **Did:** Read the whole iqps-go repo (Rust backend, Go crawler, React frontend, CI). Listed 11 issues (captured in AI_CONTEXT.md "Lessons").
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
