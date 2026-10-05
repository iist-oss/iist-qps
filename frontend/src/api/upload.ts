import { supabase } from "../lib/supabase";
import { filePathFor, friendlyUploadError, objectPathFor, type UploadDetails } from "../lib/upload";
import { sha256Hex } from "../lib/hash";

const BUCKET = "unapproved";

export type UploadResult = { ok: true; id: number | null } | { ok: false; error: string };

export async function uploadPaper(file: File, uid: string, d: UploadDetails, wantId = false): Promise<UploadResult> {
  const uuid = crypto.randomUUID();
  const objectPath = objectPathFor(uid, uuid);
  const fileHash = await sha256Hex(file);

  const up = await supabase.storage.from(BUCKET).upload(objectPath, file, {
    contentType: "application/pdf", upsert: false,
  });
  if (up.error) {
    console.error("storage upload", up.error.message);
    return { ok: false, error: friendlyUploadError(up.error.message) };
  }

  const row = {
    course_code: d.course_code,
    course_name: d.course_name,
    year: d.year,
    exam: d.exam,
    semester: d.semester,
    note: d.note,
    file_path: filePathFor(uid, uuid),
    uploaded_by: uid,
    file_hash: fileHash,
    processing_status: "uploaded",
  };

  const ins = await supabase.from("papers").insert(row).select("id").single();
  if (ins.error) {
    console.error("papers insert", ins.error.message);
    const rm = await supabase.storage.from(BUCKET).remove([objectPath]);
    if (rm.error) console.error("rollback failed", rm.error.message);
    return { ok: false, error: friendlyUploadError(ins.error.message) };
  }

  const newId = (ins.data as unknown as { id: number } | null)?.id ?? null;
  if (newId !== null) {
    const job = await supabase.rpc("enqueue_processing_job", {
      p_paper_id: newId,
      p_job_type: "validate_pdf",
    });
    if (job.error) {
      console.error("queue job", job.error.message);
      // The paper remains safely pending. A server-side sweeper can enqueue jobs later.
    }
  }

  return { ok: true, id: wantId ? newId : null };
}
