# Campus QPS scalability plan

This release keeps Supabase/PostgreSQL/Storage as the primary platform and adds a foundation for growth without prematurely introducing Kubernetes or a separate search cluster.

## Current scalable path

- PostgreSQL indexed metadata and full-text/trigram search.
- Cursor-based paper listing through `list_papers()` rather than loading the entire archive into the browser.
- `processing_jobs` for asynchronous PDF validation, OCR, metadata extraction, and preview generation.
- Atomic job claiming with `FOR UPDATE SKIP LOCKED`.
- Stale-worker recovery and bounded retries.
- Explicit processing state on each paper.
- Existing private Storage + signed URLs for PDFs.

## Next implementation phases

### Phase 2 — asynchronous processing
Move OCR out of the browser. Storage upload should create a `validate_pdf` job. A trusted worker claims jobs, validates the PDF, calculates SHA-256, runs OCR, extracts metadata, and enqueues preview generation.

### Phase 3 — search and caching
Keep PostgreSQL search until measurements justify a dedicated engine. Add a denormalized search document/materialized view first. Introduce CDN/browser caching for course catalogues and immutable published assets.

### Phase 4 — reliability and observability
Track upload success, queue depth, job latency, OCR failures, search latency, storage consumption, and pending moderation. Add structured logs and alerts before scaling traffic.

### Phase 5 — university-wide tenancy
If Campus QPS expands beyond IIST, introduce `institution_id` as a first-class key and include it in every RLS policy, index, search document, and Storage path. Do this before onboarding another institution.

### Phase 6 — recommendations and AI
Once the metadata/processing pipeline is reliable, add question-level extraction, syllabus mapping, duplicate detection, repeated-question analysis, difficulty estimates, and personalized preparation. AI should consume structured data rather than sit directly in the upload path.
