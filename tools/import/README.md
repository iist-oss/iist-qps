# Bulk import (B7)
Load a folder of old papers at once (for example from a library or an earlier batch). Imported papers are marked
"library" and go live immediately, so only complete, non-duplicate files are imported; the rest are listed.

1. Name files like `MA111C_midsem_2024_odd-semester.pdf` (code, exam, year, semester), or give a manifest.
2. Optional manifest (`list.csv`, header row, one line per file): `file,course_code,course_name,year,exam,semester,note`
   (or the same keys in a JSON array). Manifest values win over the file name.
3. Try it first, nothing is uploaded: `node --experimental-strip-types tools/import/import.mts ./papers --dry-run`
4. Real run (Termux/PC with Node 22.6+):
   ```
   export SUPABASE_URL=https://<ref>.supabase.co
   export SUPABASE_SERVICE_KEY=<service_role key>   # secret: type it in the terminal, never commit or paste it in chat
   node --experimental-strip-types tools/import/import.mts ./papers --manifest list.csv
   ```
Checks per file: real PDF, size limit, complete details, same file already on the site (SHA-256), probable duplicate
(same code, year, exam; `--allow-similar` overrides). A failed upload is rolled back. Takedown of a library paper = permanent delete (D14).
