# QPS processing worker

This worker is intentionally separate from the browser and Supabase Edge Functions. It claims queued jobs using the service role and processes at most five jobs per run.

The current worker validates PDFs, computes SHA-256, detects active duplicates, extracts native PDF text, and falls back to OCR on the first three pages for scanned papers.

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The service-role key must only exist as a CI secret or on a trusted worker host.
