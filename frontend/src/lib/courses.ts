// Pure helpers (no React/Supabase imports; unit-tested under Node).
import type { FormDetails } from "./upload";

export type Catalogue = Record<string, string>;
/** code -> curriculum semester number (1..12) */
export type CatalogueSem = Record<string, number>;

const normalize = (s: string) => s.replace(/[\s-]+/g, "").toUpperCase();

/**
 * The catalogue key for a code, or "" if unknown. Exam papers often drop the trailing letter
 * ("MA111" for MA111C), so a code with no letter also matches when exactly one key is that code + 1 letter.
 */
function resolveCode(code: string, keys: string[]): string {
  const c = normalize(code);
  if (c === "") return "";
  if (keys.includes(c)) return c;
  if (!/\d$/.test(c)) return "";
  const hits = keys.filter((k) => k.length === c.length + 1 && k.startsWith(c) && /[A-Z]$/.test(k));
  return hits.length === 1 ? hits[0] : "";
}

/** Course name for a code, or "" if unknown. */
export function lookupCourseName(code: string, cat: Catalogue): string {
  const key = resolveCode(code, Object.keys(cat));
  return key ? cat[key] : "";
}

/** Curriculum semester number for a code, or null. `cat` (the names) helps resolve a code with a dropped letter. */
export function lookupCourseSem(code: string, sems: CatalogueSem, cat: Catalogue = {}): number | null {
  const key = resolveCode(code, Object.keys({ ...cat, ...sems }));
  return key && typeof sems[key] === "number" ? sems[key] : null;
}

/** B.Tech semester 1 = odd (Jul-Dec), 2 = even (D25). */
export const semesterFromNumber = (n: number): "odd" | "even" => (n % 2 === 1 ? "odd" : "even");

/** Fills "Course name" only when the person left it blank. */
export function withCourseName(form: FormDetails, cat: Catalogue): FormDetails {
  if (form.course_name.trim() !== "") return form;
  const name = lookupCourseName(form.course_code, cat);
  return name ? { ...form, course_name: name } : form;
}

/** Fills "Semester" (odd/even) from the course's semester number, only when it is still blank. */
export function withCourseSemester(form: FormDetails, sems: CatalogueSem, cat: Catalogue = {}): FormDetails {
  if (form.semester !== "") return form;
  const n = lookupCourseSem(form.course_code, sems, cat);
  return n === null ? form : { ...form, semester: semesterFromNumber(n) };
}
