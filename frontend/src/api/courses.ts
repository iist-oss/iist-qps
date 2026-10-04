import { supabase } from "../lib/supabase";
import type { CourseRow } from "../lib/courseList";
import type { Result } from "./admin";

export interface CourseEntry extends CourseRow { source: string }
export interface Catalogues { names: Record<string, string>; sems: Record<string, number> }

type DbRow = { code: string; name: string; source?: string; sem_no?: number | null };

/** Reads the table; if the `sem_no` column does not exist yet (migration 0012 not applied) it reads without it. */
async function readCourses(extra: string): Promise<{ rows: DbRow[]; error: string | null; hasSem: boolean }> {
  const first = await supabase.from("courses").select(`code,name${extra},sem_no`).order("code").limit(5000);
  if (!first.error) return { rows: (first.data ?? []) as unknown as DbRow[], error: null, hasSem: true };
  const second = await supabase.from("courses").select(`code,name${extra}`).order("code").limit(5000);
  if (second.error) return { rows: [], error: second.error.message, hasSem: false };
  return { rows: (second.data ?? []) as unknown as DbRow[], error: null, hasSem: false };
}

/** Public read (policy courses_public_read). Empty maps if it fails. */
export async function fetchCatalogue(): Promise<Catalogues> {
  const { rows } = await readCourses("");
  const out: Catalogues = { names: {}, sems: {} };
  for (const r of rows) {
    out.names[r.code] = r.name;
    if (typeof r.sem_no === "number") out.sems[r.code] = r.sem_no;
  }
  return out;
}

export async function listCourses(): Promise<Result<CourseEntry[]>> {
  const { rows, error } = await readCourses(",source");
  if (error) return { ok: false, error };
  return { ok: true, data: rows.map((r) => ({ code: r.code, name: r.name, source: r.source ?? "", ...(typeof r.sem_no === "number" ? { sem: r.sem_no } : {}) })) };
}

/**
 * Admin only (RLS). Adds new codes and replaces the name of existing ones. A row with a semester number also sets it;
 * a row without one leaves the stored number alone (so it is saved in a separate call without the column).
 * If the database does not have `sem_no` yet, everything is saved without it and `semSkipped` is true.
 */
export async function saveCourses(rows: CourseRow[]): Promise<Result<{ count: number; semSkipped: boolean }>> {
  if (rows.length === 0) return { ok: true, data: { count: 0, semSkipped: false } };
  const now = new Date().toISOString();
  const plain = (r: CourseRow) => ({ code: r.code, name: r.name, source: "admin", updated_at: now });
  const withSem = rows.filter((r) => r.sem !== undefined);
  const withoutSem = rows.filter((r) => r.sem === undefined);
  let semSkipped = false;
  if (withSem.length > 0) {
    const { error } = await supabase.from("courses")
      .upsert(withSem.map((r) => ({ ...plain(r), sem_no: r.sem })), { onConflict: "code" });
    if (error) {
      if (!/sem_no/.test(error.message)) return { ok: false, error: error.message };
      semSkipped = true;
      withoutSem.push(...withSem);
    }
  }
  if (withoutSem.length > 0) {
    const { error } = await supabase.from("courses").upsert(withoutSem.map(plain), { onConflict: "code" });
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true, data: { count: rows.length, semSkipped } };
}

export async function deleteCourse(code: string): Promise<Result<true>> {
  const { error } = await supabase.from("courses").delete().eq("code", code);
  return error ? { ok: false, error: error.message } : { ok: true, data: true };
}
