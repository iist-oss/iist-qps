import { supabase } from "../lib/supabase";
import { normCode } from "../lib/admin";

export interface BrowseCourse { code: string; name: string; count: number }

const PAGE = 1000;
const MAX_PAGES = 10;

export async function fetchBrowseCourses(): Promise<{ courses: BrowseCourse[]; error: string | null }> {
  const byCode = new Map<string, BrowseCourse>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase.from("papers").select("id,course_code,course_name")
      .order("id", { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) return { courses: [], error: error.message };
    const rows = (data ?? []) as Array<{ course_code: string; course_name: string }>;
    for (const r of rows) {
      const code = normCode(r.course_code);
      if (code === "") continue;
      const cur = byCode.get(code);
      if (cur) { cur.count++; if (cur.name === "" && r.course_name.trim() !== "") cur.name = r.course_name.trim(); }
      else byCode.set(code, { code, name: r.course_name.trim(), count: 1 });
    }
    if (rows.length < PAGE) break;
  }
  return { courses: [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code)), error: null };
}
