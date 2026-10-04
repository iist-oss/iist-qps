import type { FormDetails } from "./upload";
import type { SemesterValue } from "./autofill";

export interface AdminPaper {
  id: number;
  file_path: string;
  from_library: boolean;
  course_code: string;
  course_name: string;
  year: number;
  semester: SemesterValue;
  exam: string;
  note: string;
  upload_timestamp: string;
  approve_status: boolean;
  is_deleted: boolean;
}

export const UNDO_MS = 8000;

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const CODE_RE = /^[A-Z]{2,4}\d{3,5}[A-Z]?$/;
const EXAM_RE = /^(midsem|endsem|lab|assignment|ct\d*)$/;

export const normCode = (s: string) => s.replace(/[\s-]+/g, "").toUpperCase();

export function paperToForm(p: Pick<AdminPaper, "course_code" | "course_name" | "year" | "exam" | "semester" | "note">): FormDetails {
  return { course_code: p.course_code, course_name: p.course_name, year: String(p.year), exam: p.exam, semester: p.semester, note: p.note };
}

export function approveProblems(f: FormDetails, nowYear: number): string[] {
  const out: string[] = [];
  const name = f.course_name.trim();
  const year = Number(f.year);
  if (!CODE_RE.test(normCode(f.course_code))) out.push("Course code is missing or invalid (for example MA111C).");
  if (name === "" || name.toLowerCase().startsWith("unknown")) out.push("Course name is required.");
  if (!Number.isInteger(year) || year < 1950 || year > nowYear + 1) out.push("Year is invalid.");
  if (!EXAM_RE.test(f.exam)) out.push("Choose the exam type.");
  if (f.semester !== "odd" && f.semester !== "even") out.push("Choose the semester (odd or even).");
  if (f.note.trim().length > 200) out.push("Note is too long (max 200 characters).");
  return out;
}

export function formToFields(f: FormDetails) {
  return {
    course_code: normCode(f.course_code),
    course_name: f.course_name.trim(),
    year: Number(f.year),
    exam: f.exam,
    semester: f.semester,
    note: f.note.trim(),
  };
}

const notesDiffer = (a: string, b: string) => a.trim() !== "" && b.trim() !== "" && a.trim().toLowerCase() !== b.trim().toLowerCase();

export function findSimilar(
  target: Pick<AdminPaper, "id" | "course_code" | "year" | "exam" | "semester"> & { note?: string },
  others: AdminPaper[],
): AdminPaper[] {
  const code = normCode(target.course_code);
  if (code === "") return [];
  return others.filter((o) =>
    o.id !== target.id && !o.is_deleted &&
    normCode(o.course_code) === code && o.year === target.year && o.exam === target.exam &&
    (o.semester === "" || target.semester === "" || o.semester === target.semester) &&
    !notesDiffer(o.note, target.note ?? ""));
}

export function bulkProblems(paper: Pick<AdminPaper, "id">, form: FormDetails, others: AdminPaper[], nowYear: number): string[] {
  const out = approveProblems(form, nowYear);
  const dupes = findSimilar(
    { id: paper.id, course_code: form.course_code, year: Number(form.year), exam: form.exam, semester: form.semester, note: form.note },
    others);
  if (dupes.length > 0) out.push(`Possible duplicate of #${dupes.slice(0, 3).map((d) => d.id).join(", #")}.`);
  return out;
}

export function ageLabel(iso: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}
