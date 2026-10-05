# Campus QPS Security Patch — 0014

Based on `campus-qps-review.md` dated 5 October 2026.

## Fixed

1. **Daily upload-cap bypass (Medium)**
   - `papers.upload_timestamp` is overwritten with `now()` by the insert trigger before the 24-hour count is checked.

2. **Keepalive/status regression (Medium)**
   - Added an anonymous, data-free `ping()` RPC.
   - Keepalive and the Status page now use `ping()` instead of the signed-in-only `get_stats()` RPC.

3. **Incorrect privacy/documentation text (Medium)**
   - About, Takedown, Admin and README now describe signed-in access and private approved storage accurately.
   - Migration count and storage model were updated.

4. **Storage abuse through orphan uploads (Medium)**
   - Added a Storage-side per-user cap of 20 unapproved objects.
   - This covers objects that never receive a `papers` row.
   - Existing 47 MiB/object limit means a single user can hold at most roughly 940 MiB of unapproved objects.

5. **Uploader/admin/file-hash exposure (Low–Medium)**
   - Normal authenticated table clients can no longer select `uploaded_by`, `approved_by`, or `file_hash`.
   - The “My uploads” page now uses a security-definer `my_uploads()` RPC that returns only the fields the user needs.

6. **Mail/header control characters (Low)**
   - Added database constraints rejecting control characters in user-controlled paper text and paths.
   - `notify-upload` additionally strips control characters and bounds the generated email label.

7. **Anonymous email-list probing (Low)**
   - Removed the client-side `email_domain_ok()` call.
   - Revoked execute access to `email_domain_ok()` and `email_in_allowed_list()` from normal API roles.
   - Signup remains enforced by the database trigger; the server-side allow-list remains authoritative.

8. **Basic browser CSP hardening**
   - Added a CSP meta policy.
   - Allowed Supabase plus the currently expected Tesseract runtime hosts so OCR is not intentionally broken by the policy.

9. **Supply-chain looseness — partial hardening**
   - Direct frontend dependency ranges are pinned to exact versions.
   - Supabase CLI in the Edge Function workflow is no longer `latest`.
   - A lockfile could not be generated in this environment because npm registry access timed out, so `npm install` is retained rather than introducing a broken `npm ci` workflow.

## Not silently changed

The review also identified these lower-priority items, but they require either a product decision or a broader architectural change and are not disguised as fixed:

- one-hour signed PDF links can be forwarded until expiry;
- Tesseract third-party runtime assets are not fully self-hosted;
- GitHub Actions are version-pinned but not converted to immutable commit SHAs;
- delete undo remains an 8-second client-side operation;
- browse/admin count and 10,000-row limitations remain;
- dead `file_hash`/`from_library` behaviour and duplicated course-code regexes remain;
- automated personal-data detection before bulk approval remains absent.

## Required validation in a test Supabase project

After applying migrations 0001–0014:

1. Attempt to insert a paper with an old `upload_timestamp`; confirm the stored timestamp is current and the daily cap cannot be bypassed.
2. Upload 20 unapproved objects for one user; confirm object 21 is rejected until existing objects leave the unapproved bucket.
3. Confirm anonymous `get_stats`, `search_papers`, `email_domain_ok`, and `email_in_allowed_list` are not executable.
4. Confirm anonymous `ping()` succeeds and keepalive works.
5. Confirm a normal authenticated client cannot select `uploaded_by`, `approved_by`, or `file_hash`.
6. Confirm the My Uploads page still works through `my_uploads()`.
7. Upload a paper whose course name/note contains CR/LF; confirm the database rejects it.
8. Run `npm install` followed by `npm run build` in an environment with registry access.
9. Manually test sign-in, upload, approval, search, PDF opening, trash, restore, and permanent delete.

This patch was produced from static review and local source inspection. No live Supabase project was attacked or modified.
