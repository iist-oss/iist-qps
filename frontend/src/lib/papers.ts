// Pure helpers (no React/Supabase imports) so they can be unit-tested in plain Node.
import type { ExamFilter, Paper } from "../types";

export const ALL_EXAM_FILTERS: ExamFilter[] = ["midsem", "endsem", "ct", "lab", "assignment"];

/** Parses `?exam=midsem,ct`. Missing param -> all; unknown values dropped. */
export function parseExamFilter(raw: string | null): ExamFilter[] {
  if (raw === null) return [...ALL_EXAM_FILTERS];
  return raw.split(",").map((s) => s.trim())
    .filter((s): s is ExamFilter => (ALL_EXAM_FILTERS as string[]).includes(s));
}

export function semesterTag(sem: Paper["semester"]): string {
  return sem === "odd" ? "ODD" : sem === "even" ? "EVEN" : "N/A";
}
export function semesterTooltip(sem: Paper["semester"]): string {
  return sem === "odd" ? "Odd semester" : sem === "even" ? "Even semester" : "Unknown semester";
}
export function examTag(exam: string): string {
  if (exam === "") return "Unknown";
  if (exam === "midsem") return "MID";
  if (exam === "endsem") return "END";
  if (exam === "lab") return "LAB";
  if (exam === "assignment") return "ASSIGN";
  return exam.toUpperCase(); // ct, ct1, ct2 ...
}
export function examTooltip(exam: string): string {
  if (exam === "") return "Unknown exam";
  if (exam === "midsem") return "Midsem";
  if (exam === "endsem") return "Endsem";
  if (exam === "lab") return "Lab / practical";
  if (exam === "assignment") return "Assignment";
  const n = exam.slice(2);
  return `Class test ${n.length > 0 ? n : "?"}`;
}
export function paperTitle(p: Pick<Paper, "course_name" | "course_code">): string {
  return p.course_code ? `${p.course_name} (${p.course_code})` : p.course_name;
}

export type SortBy = "relevance" | "course_name" | "year";
export type SortOrder = "ascending" | "descending";

export function availableYears(results: Paper[]): number[] {
  return [...new Set(results.map((r) => r.year))].sort((a, b) => b - a);
}

/** Sorting by year while filtered to one year falls back to course name. */
export function filterAndSort(
  results: Paper[],
  opts: { year: number | null; sortBy: SortBy; order: SortOrder },
): Paper[] {
  let out = opts.year === null ? results.slice() : results.filter((r) => r.year === opts.year);
  if (opts.sortBy === "relevance") return out;

  const fallback = opts.sortBy === "year" && opts.year !== null;
  const by: SortBy = fallback ? "course_name" : opts.sortBy;
  const order: SortOrder = fallback ? "ascending" : opts.order;
  const dir = order === "ascending" ? 1 : -1;

  out = out.sort((a, b) =>
    by === "year" ? dir * (a.year - b.year) : dir * a.course_name.localeCompare(b.course_name));
  return out;
}

export function formatCount(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}
