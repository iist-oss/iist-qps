# Edge Functions – API contract (frontend uses these in B3/B5)

All responses: `{ status: "success" | "error", message: string, data: ... }`.
Call with `supabase.functions.invoke(name, { body })` (sends the user's JWT automatically).
`file_path` is always `"<bucket>/<path>"`; public URL for approved files =
`<SUPABASE_URL>/storage/v1/object/public/<file_path>`; unapproved files need a signed URL
(admins: `createSignedUrl`).

## approve-paper  (admin)
Request: `{ id, course_code?, course_name?, year?, exam?, semester?, note?, approve_status?, replace?: number[] }`
- Omitted fields keep current values. Validation is strict when approving (all fields required), lenient otherwise.
- Uploaded papers: approving moves the file `unapproved -> approved` and renames it
  `<id>_<code>_<name>_<year>_<sem>_<exam>.pdf`; un-approving moves it back to `unapproved/restored/<id>.pdf`.
- Library (imported) papers never move; they live in the `approved` bucket and visibility is controlled by `approve_status`.
- `replace`: ids of duplicates to soft-delete in the same DB transaction (their uploaded files are then made private, best effort).
- Response data: the updated `papers` row.  Errors: 400 validation (`data.errors[]`), 401, 403, 404, 500.

## delete-paper  (admin)
Request: `{ ids: number[] (<=100), mode: "soft" | "restore" | "hard" }`
- `soft` -> trash (an uploaded paper's file is moved to `unapproved/trash/<id>.pdf` so it is no longer public; library papers do not move); `restore` -> out of trash, unapproved; `hard` -> permanent, only if already in trash.
- Response data: `[{ id, status, message }]` – one per id, batch never aborts.

## notify-upload  (DB webhook, not called by the frontend)
Triggered by INSERT on `papers`. Needs header `x-webhook-secret`. Emails every admin (Gmail SMTP, port 465; first upload of a 10-minute burst only) and posts to Slack if configured. Each channel is skipped if its secrets are unset.

## daily-digest  (scheduled, not called by the frontend)
Called once a day by `.github/workflows/digest.yml` (POST, header `x-webhook-secret` = WEBHOOK_SECRET). Counts papers waiting for review; if there are none it answers 200 "Nothing waiting" and sends nothing; otherwise it emails every admin ("N papers waiting for review", new in 24 h, age of the oldest, review link). Errors: 401 wrong secret, 500 SMTP not configured / no admin email / DB error, 502 SMTP send failed (the workflow turns red). `NOTIFY_MODE=digest` makes `notify-upload` do nothing.

## Required function secrets
`WEBHOOK_SECRET` (any long random string), `SMTP_USER` + `SMTP_PASS` (Gmail address + app password, for admin emails), `SMTP_FROM`/`SMTP_HOST`/`SMTP_PORT` (optional), `SLACK_WEBHOOK_URL` (optional), `SITE_URL` (optional, for the review link).
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.
