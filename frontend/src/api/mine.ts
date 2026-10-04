import { supabase } from "../lib/supabase";
import type { Result } from "./admin";
import type { SemesterValue } from "../lib/autofill";

export interface MyPaper {
  id: number;
  course_code: string;
  course_name: string;
  year: number;
  exam: string;
  semester: SemesterValue;
  note: string;
  upload_timestamp: string;
  approve_status: boolean;
  is_deleted: boolean;
}

const COLS = "id,course_code,course_name,year,exam,semester,note,upload_timestamp,approve_status,is_deleted";

export async function listMine(userId: string): Promise<Result<MyPaper[]>> {
  const { data, error } = await supabase.from("papers").select(COLS)
    .eq("uploaded_by", userId).order("upload_timestamp", { ascending: false }).limit(200);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as MyPaper[] };
}
