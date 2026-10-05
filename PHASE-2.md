# Campus QPS — Phase 2: Async Processing

Uploads now enter a trusted processing queue. The browser is no longer the authoritative PDF validator or OCR processor.

Pipeline:

`upload → Storage → paper row → validate_pdf → OCR → ready_for_review`

The database trigger creates the first validation job automatically, so a client cannot skip the processing pipeline.

## Worker

`workers/process-jobs.mjs` runs in GitHub Actions and uses:

- `pdftotext` for native PDF text
- `pdftoppm` for scanned-page rendering
- `tesseract-ocr` for scanned PDF OCR

The worker atomically claims jobs, validates the `%PDF-` signature, calculates SHA-256, detects duplicates, extracts OCR/text, and marks the paper ready for moderation.

## Required GitHub secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Never put the service-role key in frontend code or the repository.

## Transitional worker note

GitHub Actions is intentionally a transitional worker for the current project. At larger scale, move the same worker contract to a persistent/containerized worker service. The database queue can remain unchanged.

## Migration

Apply `0016_async_processing_worker.sql` after `0015_scalability_foundation.sql`.
