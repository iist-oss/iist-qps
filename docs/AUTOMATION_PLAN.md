# Automation plan (session 30: full code review + what to automate)

## Review: what I found
Fixed in this session:
1. PRIVACY: `app_settings` was readable by anyone (0003), and 0005 stores `allowed_extra_emails` there -> migration 0011 makes it admin-only (pgTAP test added).
2. BUG (mine, session 29): admin review cards still used only the built-in course list; they now use the live catalogue (`lib/useCatalogue.ts`, shared with the upload page).

Open (planned below):
3. PRIVACY: anyone can read `uploaded_by` / `approved_by` ids of approved papers through the REST API (`papers_public_read` exposes all columns). Not emails, but the takedown page says uploads are not shown publicly. Fix: column-level grants for anon + make `search_papers` SECURITY DEFINER with explicit columns (it uses `select *` today). -> task C0.
4. Migrations are applied by hand in the SQL editor (0005 to 0011) and the Pages deploy does not wait for them: a new frontend can go live before its table exists. -> Phase A.
5. The course-code pattern lives in 4 files "kept in sync by hand" (config, lib/autofill, lib/upload, validate.ts) plus lib/admin and the SQL check. -> a test that fails if they disagree (A4).
6. No `package-lock.json` in the repo zip: builds are not reproducible and Dependabot cannot help. Check the repo; if absent, commit it (A4).
7. notify-upload sends one email per 10-minute burst; if that email fails, the rest of the burst is silent. A digest is more reliable (C1).
8. Exact duplicate PDFs are not detected (file_hash stays empty for uploads, on purpose: users must not set it). -> B4.
9. Known and still open: storage uploads are not covered by the daily cap; bucket MIME check trusts the client.
10. Nothing watches the live site: the earlier outage (bad URL secret) was found by a person. -> C5.
11. Never run on a real device/browser: React pages (Courses admin, About, Takedown), ocr.ts on real scans, notify-upload email. Confirm by use.

## Phase A: one push does everything (biggest win)
- A1 `release.yml`: tests -> `supabase db push` -> deploy Edge Functions -> deploy Pages, in that order, one workflow. One-time: add secret SUPABASE_DB_PASSWORD (+ SUPABASE_ACCESS_TOKEN if missing) and run a one-off "baseline" job that marks 0001-0009 as already applied (`supabase migration repair`). After that you never open the SQL editor again.
- A2 `push.sh`: after pushing, watch the run, say GREEN or RED, and on RED print the failing log tail (no more pasting commands).
- A3 Build stamp (commit + time) in the footer and /status, so "is my push live?" is answered on the page.
- A4 Dependabot (npm + Actions), commit the lockfile, add the "patterns agree" test.
- A5 GitHub issue templates: takedown request, bug, paper request (labels set automatically).

## Phase B: less clicking for the admin
- B1 Admin uploads skip the queue: if you upload as admin and the details are complete, approve right away (checkbox, on by default).
- B2 Bulk approve: tick several cards that are complete and have no duplicate, one button.
- B3 Course catalogue knows each course's semester: "Semester 2" headings in the pasted list set it; autofill then fills odd/even and the admin no longer picks it for every paper.
- B4 Server-side SHA-256 of each PDF at approval: stored in `file_hash`, flags "identical file already exists".
- B5 Warning badge on a card when the first page looks like it has a name / roll number (warn only; a person still decides).
NOT automated on purpose: approving papers (personal data, wrong files) and takedown deletions.

## Phase C: maintenance on autopilot
- C0 Hide uploader ids from the public API (finding 3).
- C1 Daily digest email: "N papers waiting" (scheduled), replacing the burst guard.
- C2 Weekly clean-up: permanently delete trash older than 30 days, remove orphan files in `unapproved/`.
- C3 Webhook for notify-upload created by migration instead of by hand (needs the secret stored in Supabase Vault; decide later).
- C4 Weekly backup of public data (courses + approved paper metadata) to a PRIVATE place. PDFs are not backed up by Supabase Free: decide if that matters. Never as a public GitHub artifact.
- C5 Health check every 6 h (search RPC, auth health, a page load); opens a GitHub issue if it fails (extends keepalive).

## Phase D: content
- D1 `tools/import`: folder of PDFs -> autofill (same code as the site) -> upload and approve as admin, with a dry run. For backlog from other years.
- D2 In-browser splitting of bundle PDFs (mark pages), only if students start uploading bundles.

## Suggested order
A1-A3 -> B1-B3 -> C0 -> C1, C5 -> A4-A5 -> B4-B5 -> C2, D1.
What I need from you for A1: the Supabase database password (as a GitHub secret, never in chat) and the access token secret.
