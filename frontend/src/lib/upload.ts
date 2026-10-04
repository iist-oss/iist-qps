// Pure helpers for the upload page (no React/Supabase imports; unit-tested under Node).
import type { Detected, SemesterValue } from "./autofill";

/** What the user edits (all strings, as typed). */
export interface FormDetails {
  course_code: string;
  course_name: string;
  year: string;
  exam: string;
  semester: SemesterValue;
  note: string;
}

/** What gets saved (validated). */
export interface UploadDetails {
  course_code: string;
  course_name: string;
  year: number;
  exam: string;
  semester: SemesterValue;
  note: string;
}

export const EXAM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Select exam…" },
  { value: "midsem", label: "Midsem" },
  { value: "endsem", label: "Endsem" },
  { value: "ct", label: "Class test" },
  { value: "ct1", label: "Class test 1" },
  { value: "ct2", label: "Class test 2" },
  { value: "ct3", label: "Class test 3" },
  { value: "ct4", label: "Class test 4" },
  { value: "ct5", label: "Class test 5" },
];
export const SEMESTER_OPTIONS: Array<{ value: SemesterValue; label: string }> = [
  { value: "", label: "Not sure" },
  { value: "odd", label: "Odd semester" },
  { value: "even", label: "Even semester" },
];

const CODE_RE = /^[A-Z]{2,4}\d{3,5}$/; // keep in sync with supabase/functions/_shared/validate.ts
const EXAM_RE = /^(midsem|endsem|ct\d*)$/;

export const emptyForm = (): FormDetails =>
  ({ course_code: "", course_name: "", year: "", exam: "", semester: "", note: "" });

export function toForm(d: Detected): FormDetails {
  return { course_code: d.course_code, course_name: "", year: d.year === null ? "" : String(d.year),
    exam: d.exam, semester: d.semester, note: d.note };
}

/** Fill only the fields the user (or an earlier step) left blank. */
export function fillBlanks(form: FormDetails, d: Detected): FormDetails {
  return {
    ...form,
    course_code: form.course_code.trim() || d.course_code,
    year: form.year.trim() || (d.year === null ? "" : String(d.year)),
    exam: form.exam || d.exam,
    semester: form.semester || d.semester,
    note: form.note.trim() || d.note,
  };
}

export type FormResult = { ok: true; value: UploadDetails } | { ok: false; errors: string[] };

export function validateForm(f: FormDetails, nowYear: number): FormResult {
  const errors: string[] = [];
  const course_code = f.course_code.replace(/[\s-]+/g, "").toUpperCase();
  const course_name = f.course_name.trim();
  const note = f.note.trim();
  const year = Number(f.year);
  if (!CODE_RE.test(course_code)) errors.push("Enter a valid course code (for example MA101).");
  if (!Number.isInteger(year) || year < 1950 || year > nowYear + 1) errors.push("Enter a valid year.");
  if (!EXAM_RE.test(f.exam)) errors.push("Choose the exam type.");
  if (course_name.length > 200) errors.push("Course name is too long (max 200 characters).");
  if (note.length > 200) errors.push("Note is too long (max 200 characters).");
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { course_code, course_name, year, exam: f.exam, semester: f.semester, note } };
}

/** Quick checks before reading the file. Returns an error message or null. */
export function checkFileBasic(f: { name: string; size: number; type: string }, maxMiB: number): string | null {
  const looksPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
  if (!looksPdf) return "Only PDF files are allowed.";
  if (f.size === 0) return "This file is empty.";
  if (f.size > maxMiB * 1024 * 1024) return `This file is larger than ${maxMiB} MiB.`;
  return null;
}

/** Real PDFs contain "%PDF-" near the start. */
export function hasPdfMagic(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, 1024) - 4;
  for (let i = 0; i < limit; i++) {
    if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46 && bytes[i + 4] === 0x2d) return true;
  }
  return false;
}

/** Object path inside the `unapproved` bucket. RLS requires the first folder to be the user's id. */
export const objectPathFor = (uid: string, uuid: string) => `${uid}/${uuid}.pdf`;
/** papers.file_path value ("<bucket>/<path>", D4). */
export const filePathFor = (uid: string, uuid: string) => `unapproved/${objectPathFor(uid, uuid)}`;

export function friendlyUploadError(msg: string): string {
  if (/daily upload limit/i.test(msg)) return "You have reached today's upload limit. Try again tomorrow.";
  if (/row-level security|violates|not authorized|unauthorized|403/i.test(msg)) return "You are not allowed to upload. Sign out and sign in again with your university email.";
  if (/too large|exceeded the maximum|payload/i.test(msg)) return "The file is too large.";
  if (/mime|content type|not supported/i.test(msg)) return "Only PDF files are allowed.";
  if (/network|failed to fetch|load failed/i.test(msg)) return "Network problem. Check your connection and try again.";
  return "Upload failed. Please try again.";
}
