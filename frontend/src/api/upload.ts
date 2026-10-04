import { supabase } from "../lib/supabase";
import { filePathFor, friendlyUploadError, objectPathFor, type UploadDetails } from "../lib/upload";

const BUCKET = "unapproved";

export type UploadResult = { ok: true } | { ok: false; error: string };

/**
 * 1) put the PDF in unapproved/<uid>/<uuid>.pdf   2) insert the papers row.
 * If step 2 fails the file is removed again (allowed by policy unapproved_owner_cleanup),
 * so a failure never leaves an orphan behind. One file per call: callers never abort a batch.
 */
export async function uploadPaper(file: File, uid: string, d: UploadDetails): Promise<UploadResult> {
  const uuid = crypto.randomUUID();
  const objectPath = objectPathFor(uid, uuid);

  const up = await supabase.storage.from(BUCKET).upload(objectPath, file, {
    contentType: "application/pdf", upsert: false,
  });
  if (up.error) {
    console.error("storage upload", up.error.message);
    return { ok: false, error: friendlyUploadError(up.error.message) };
  }

  const ins = await supabase.from("papers").insert({
    course_code: d.course_code,
    course_name: d.course_name,
    year: d.year,
    exam: d.exam,
    semester: d.semester,
    note: d.note,
    file_path: filePathFor(uid, uuid),
    uploaded_by: uid,
  });
  if (ins.error) {
    console.error("papers insert", ins.error.message);
    const rm = await supabase.storage.from(BUCKET).remove([objectPath]);
    if (rm.error) console.error("rollback failed", rm.error.message);
    return { ok: false, error: friendlyUploadError(ins.error.message) };
  }
  return { ok: true };
}
