import { supabase } from "../lib/supabase";
import type { ExamFilter, Paper } from "../types";

export async function searchPapers(
  query: string,
  exams: ExamFilter[],
): Promise<{ data: Paper[]; error: string | null }> {
  const { data, error } = await supabase.rpc("search_papers", { q: query, exams });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Paper[], error: null };
}

export async function getStats(): Promise<{ totalPapers: number; totalCourses: number } | null> {
  const { data, error } = await supabase.rpc("get_stats");
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { totalPapers: Number(row.total_papers), totalCourses: Number(row.total_courses) };
}

export function publicFileUrl(filePath: string): string {
  const i = filePath.indexOf("/");
  const bucket = filePath.slice(0, i);
  const path = filePath.slice(i + 1);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
