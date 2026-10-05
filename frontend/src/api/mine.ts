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


export async function listMine(_userId: string): Promise<Result<MyPaper[]>> {
  const { data, error } = await supabase.rpc("my_uploads");
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as MyPaper[] };
}
