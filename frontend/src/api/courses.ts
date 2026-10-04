import { supabase } from "../lib/supabase";
import type { CourseRow } from "../lib/courseList";
import type { Result } from "./admin";

export interface CourseEntry extends CourseRow { source: string }

/** Public read (policy courses_public_read). Returns code -> name; an empty object if it fails. */
export async function fetchCatalogue(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("courses").select("code,name").limit(5000);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const r of data as CourseRow[]) out[r.code] = r.name;
  return out;
}

export async function listCourses(): Promise<Result<CourseEntry[]>> {
  const { data, error } = await supabase.from("courses").select("code,name,source").order("code").limit(5000);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as CourseEntry[] };
}

/** Admin only (RLS). Adds new codes and replaces the name of existing ones. */
export async function saveCourses(rows: CourseRow[]): Promise<Result<number>> {
  if (rows.length === 0) return { ok: true, data: 0 };
  const payload = rows.map((r) => ({ code: r.code, name: r.name, source: "admin", updated_at: new Date().toISOString() }));
  const { error } = await supabase.from("courses").upsert(payload, { onConflict: "code" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: rows.length };
}

export async function deleteCourse(code: string): Promise<Result<true>> {
  const { error } = await supabase.from("courses").delete().eq("code", code);
  return error ? { ok: false, error: error.message } : { ok: true, data: true };
}
