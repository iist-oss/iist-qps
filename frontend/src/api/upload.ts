import { supabase } from "../lib/supabase";
import { filePathFor, friendlyUploadError, objectPathFor, type UploadDetails } from "../lib/upload";

const BUCKET = "unapproved";

export type UploadResult = { ok: true; id: number | null } | { ok: false; error: string };

export async function uploadPaper(file: File, uid: string, d: UploadDetails, wantId = false): Promise<UploadResult> {
  const uuid = crypto.randomUUID();
  const objectPath = objectPathFor(uid, uuid);

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
  };
  let newId: number | null = null;
  let insError: { message: string } | null = null;
  if (wantId) {
    const ins = await supabase.from("papers").insert(row).select("id").single();
    insError = ins.error;
    if (!ins.error) newId = (ins.data as unknown as { id: number } | null)?.id ?? null;
  } else {
    insError = (await supabase.from("papers").insert(row)).error;
  }
  const ins = { error: insError };
  if (ins.error) {
    console.error("papers insert", ins.error.message);
    const rm = await supabase.storage.from(BUCKET).remove([objectPath]);
    if (rm.error) console.error("rollback failed", rm.error.message);
    return { ok: false, error: friendlyUploadError(ins.error.message) };
  }
  return { ok: true, id: newId };
}
