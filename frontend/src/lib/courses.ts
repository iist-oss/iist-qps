// Pure helpers (no React/Supabase imports; unit-tested under Node).
import type { FormDetails } from "./upload";

export type Catalogue = Record<string, string>;

const normalize = (s: string) => s.replace(/[\s-]+/g, "").toUpperCase();

/**
 * Course name for a code, or "" if unknown. Exam papers often drop the trailing letter
 * ("MA111" for MA111C), so a code with no letter also matches when exactly one catalogue entry is that code + 1 letter.
 */
export function lookupCourseName(code: string, cat: Catalogue): string {
  const c = normalize(code);
  if (c === "") return "";
  if (cat[c]) return cat[c];
  if (!/\d$/.test(c)) return "";
  const hits = Object.keys(cat).filter((k) => k.length === c.length + 1 && k.startsWith(c) && /[A-Z]$/.test(k));
  return hits.length === 1 ? cat[hits[0]] : "";
}

/** Fills "Course name" only when the person left it blank. */
export function withCourseName(form: FormDetails, cat: Catalogue): FormDetails {
  if (form.course_name.trim() !== "") return form;
  const name = lookupCourseName(form.course_code, cat);
  return name ? { ...form, course_name: name } : form;
}
