import { fail, ok, preflight } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { splitSlug } from "../_shared/validate.ts";
import { parkPublicFile, type Parked } from "../_shared/trash.ts";

interface Result { id: number; status: "success" | "error"; message: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return fail("Method not allowed.", 405);

  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;
  const { db } = ctx;

  let body: any;
  try { body = await req.json(); } catch { return fail("Invalid JSON body."); }

  const mode = body?.mode;
  if (!["soft", "restore", "hard"].includes(mode)) return fail("`mode` must be soft, restore or hard.");
  const ids: number[] = Array.isArray(body?.ids)
    ? [...new Set<number>((body.ids as unknown[]).map(Number))].filter((n) => Number.isInteger(n) && n > 0)
    : [];
  if (ids.length === 0) return fail("`ids` must be a non-empty array.");
  if (ids.length > 100) return fail("At most 100 ids per request.");

  const results: Result[] = [];
  for (const id of ids) {
    try {
      if (mode === "soft") {
        const { data: row, error: selErr } = await db.from("papers")
          .select("id, file_path, from_library").eq("id", id).eq("is_deleted", false).maybeSingle();
        if (selErr) { results.push({ id, status: "error", message: "Database error." }); continue; }
        if (!row) { results.push({ id, status: "error", message: "Not found or already deleted." }); continue; }

        let parked: Parked | null = null;
        try {
          parked = await parkPublicFile(db, id, row.file_path, row.from_library);
        } catch (e) {
          console.error(`delete-paper soft ${id}:`, e);
          results.push({ id, status: "error", message: "Could not make the file private; nothing changed." });
          continue;
        }
        const { data, error } = await db.from("papers")
          .update({ approve_status: false, is_deleted: true, ...(parked ? { file_path: parked.filePath } : {}) })
          .eq("id", id).eq("is_deleted", false).select("id");
        if (error || !data?.length) {
          await parked?.undo();
          results.push({ id, status: "error", message: error ? "Database error." : "Not found or already deleted." });
        } else {
          results.push({ id, status: "success", message: "Moved to trash." });
        }
      } else if (mode === "restore") {
        const { data, error } = await db.from("papers")
          .update({ is_deleted: false, approve_status: false })
          .eq("id", id).eq("is_deleted", true).select("id");
        results.push(error ? { id, status: "error", message: "Database error." }
          : data?.length ? { id, status: "success", message: "Restored (needs re-approval)." }
          : { id, status: "error", message: "Not in trash." });
      } else {
        const { data: row, error: selErr } = await db.from("papers")
          .select("id, file_path").eq("id", id).eq("is_deleted", true).maybeSingle();
        if (selErr) { results.push({ id, status: "error", message: "Database error." }); continue; }
        if (!row) { results.push({ id, status: "error", message: "Not in trash (soft-delete first)." }); continue; }

        const { error: delErr } = await db.from("papers").delete().eq("id", id);
        if (delErr) { results.push({ id, status: "error", message: "Database error." }); continue; }

        const { bucket, path } = splitSlug(row.file_path);
        const { error: rmErr } = await db.storage.from(bucket).remove([path]);
        if (rmErr) console.error(`ORPHANED FILE ${row.file_path}: ${rmErr.message}`);
        results.push({ id, status: "success",
          message: rmErr ? "Deleted (file cleanup failed; logged)." : "Permanently deleted." });
      }
    } catch (e) {
      console.error(`delete-paper ${mode} ${id}:`, e);
      results.push({ id, status: "error", message: "Unexpected error." });
    }
  }

  const okCount = results.filter((r) => r.status === "success").length;
  return ok(`${okCount} of ${results.length} succeeded.`, results);
});
