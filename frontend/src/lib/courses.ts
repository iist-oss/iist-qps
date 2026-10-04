import type { FormDetails } from "./upload";

export type Catalogue = Record<string, string>;
export type CatalogueSem = Record<string, number>;

const normalize = (s: string) => s.replace(/[\s-]+/g, "").toUpperCase();

function resolveCode(code: string, keys: string[]): string {
  const c = normalize(code);
  if (c === "") return "";
  if (keys.includes(c)) return c;
  if (!/\d$/.test(c)) return "";
  const hits = keys.filter((k) => k.length === c.length + 1 && k.startsWith(c) && /[A-Z]$/.test(k));
  return hits.length === 1 ? hits[0] : "";
}

export function lookupCourseName(code: string, cat: Catalogue): string {
  const key = resolveCode(code, Object.keys(cat));
  return key ? cat[key] : "";
}

export function lookupCourseSem(code: string, sems: CatalogueSem, cat: Catalogue = {}): number | null {
  const key = resolveCode(code, Object.keys({ ...cat, ...sems }));
  return key && typeof sems[key] === "number" ? sems[key] : null;
}

export const semesterFromNumber = (n: number): "odd" | "even" => (n % 2 === 1 ? "odd" : "even");

export function withCourseName(form: FormDetails, cat: Catalogue): FormDetails {
  if (form.course_name.trim() !== "") return form;
  const name = lookupCourseName(form.course_code, cat);
  return name ? { ...form, course_name: name } : form;
}

export function withCourseSemester(form: FormDetails, sems: CatalogueSem, cat: Catalogue = {}): FormDetails {
  if (form.semester !== "") return form;
  const n = lookupCourseSem(form.course_code, sems, cat);
  return n === null ? form : { ...form, semester: semesterFromNumber(n) };
}
