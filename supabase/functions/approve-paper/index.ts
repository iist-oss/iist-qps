import { fail, ok, preflight } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { approvedFileName, splitSlug, validateDetails } from "../_shared/validate.ts";
import { parkPublicFile } from "../_shared/trash.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return fail("Method not allowed.", 405);

  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;
  const { user, db } = ctx;

  let body: any;
  try { body = await req.json(); } catch { return fail("Invalid JSON body."); }

  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) return fail("`id` is required.");

  const { data: cur, error: curErr } = await db.from("papers").select("*")
    .eq("id", id).eq("is_deleted", false).maybeSingle();
  if (curErr) return fail("Database error.", 500);
  if (!cur) return fail("Paper not found (or deleted).", 404);

  const approve: boolean = typeof body.approve_status === "boolean" ? body.approve_status : cur.approve_status;

  const v = validateDetails({
    course_code: body.course_code ?? cur.course_code,
    course_name: body.course_name ?? cur.course_name,
    year: body.year ?? cur.year,
    exam: body.exam ?? cur.exam,
    semester: body.semester ?? cur.semester,
    note: body.note ?? cur.note,
  }, approve);
  if (!v.ok) return fail(v.errors.join(" "), 400, { errors: v.errors });
  const d = v.value;

  const replace: number[] = Array.isArray(body.replace)
    ? body.replace.map(Number).filter((n: number) => Number.isInteger(n) && n > 0 && n !== id)
    : [];

  const from = splitSlug(cur.file_path);
  let to = from;
  if (!cur.from_library) {
    if (approve) {
      to = { bucket: "approved", path: approvedFileName(id, d) };
    } else if (from.bucket === "approved") {
      to = { bucket: "unapproved", path: `restored/${id}.pdf` };
    }
  }
  const moving = to.bucket !== from.bucket || to.path !== from.path;

  if (moving) {
    const { error: mvErr } = await db.storage.from(from.bucket)
      .move(from.path, to.path, { destinationBucket: to.bucket });
    if (mvErr) return fail(`Could not move the file: ${mvErr.message}`, 500);
  }

  const { data: updated, error: rpcErr } = await db.rpc("admin_apply_edit", {
    p_id: id, p_course_code: d.course_code, p_course_name: d.course_name, p_year: d.year,
    p_exam: d.exam, p_semester: d.semester, p_note: d.note, p_approve: approve,
    p_file_path: `${to.bucket}/${to.path}`, p_admin: user.id, p_replace: replace,
  });

  if (rpcErr) {
    if (moving) {
      const { error: undoErr } = await db.storage.from(to.bucket)
        .move(to.path, from.path, { destinationBucket: from.bucket });
      if (undoErr) console.error(`ROLLBACK FAILED for paper ${id}: ${undoErr.message}`);
    }
    console.error(`admin_apply_edit failed for paper ${id}: ${rpcErr.message}`);
    return fail("Could not save the changes.", 500);
  }

  if (replace.length > 0) {
    const { data: gone } = await db.from("papers").select("id, file_path, from_library").in("id", replace);
    for (const r of gone ?? []) {
      try {
        const parked = await parkPublicFile(db, r.id, r.file_path, r.from_library);
        if (parked) {
          const { error } = await db.from("papers").update({ file_path: parked.filePath }).eq("id", r.id);
          if (error) await parked.undo();
        }
      } catch (e) {
        console.error(`could not make replaced paper ${r.id} private:`, e);
      }
    }
  }

  return ok("Successfully updated paper details.", updated);
});
