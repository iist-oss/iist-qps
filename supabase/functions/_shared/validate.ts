export const SEMESTERS = ["", "odd", "even"] as const; // D12
const COURSE_CODE_RE = /^[A-Z]{2,4}\d{3,5}[A-Z]?$/;         // D7/D25: MA111C style (keep in sync with frontend config)

export interface PaperDetails {
  course_code: string;
  course_name: string;
  year: number;
  exam: string;
  semester: string;
  note: string;
}

export const normalizeCourseCode = (s: string) => s.replace(/[\s-]+/g, "").toUpperCase();
export const isValidExam = (e: string) => e === "" || e === "midsem" || e === "endsem" || e === "lab" || e === "assignment" || /^ct\d*$/.test(e);

export type ValidationResult =
  | { ok: true; value: PaperDetails }
  | { ok: false; errors: string[] };

/** requireComplete = true when approving: every field must be filled in properly. */
export function validateDetails(d: PaperDetails, requireComplete: boolean): ValidationResult {
  const errors: string[] = [];
  const course_code = normalizeCourseCode(d.course_code ?? "");
  const course_name = (d.course_name ?? "").trim();
  const note = (d.note ?? "").trim();
  const year = Number(d.year);
  const exam = (d.exam ?? "").trim().toLowerCase();
  const semester = (d.semester ?? "").trim().toLowerCase();

  if (course_code !== "" || requireComplete) {
    if (!COURSE_CODE_RE.test(course_code)) errors.push("Invalid course code.");
  }
  if (requireComplete && (course_name === "" || course_name.toLowerCase().startsWith("unknown"))) {
    errors.push("Course name is required.");
  }
  if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1) {
    errors.push("Invalid year.");
  }
  if (!isValidExam(exam)) errors.push("Invalid exam.");
  if (requireComplete && exam === "") errors.push("Exam is required.");
  if (!(SEMESTERS as readonly string[]).includes(semester)) errors.push("Invalid semester (use odd or even).");
  if (requireComplete && semester === "") errors.push("Semester is required.");
  if (note.length > 200) errors.push("Note too long (max 200 chars).");

  return errors.length ? { ok: false, errors } : { ok: true, value: { course_code, course_name, year, exam, semester, note } };
}

/** Path sanitiser: ASCII alphanumerics/underscore, words joined by '-'. */
export function sanitizePath(s: string): string {
  return s.replaceAll("/", "-").replaceAll("-", " ").split(/\s+/).filter(Boolean)
    .map((p) => p.replace(/[^A-Za-z0-9_]/g, "")).filter(Boolean).join("-");
}

export function approvedFileName(id: number, d: PaperDetails): string {
  const base = sanitizePath(`${id}_${d.course_code}_${d.course_name}_${d.year}_${d.semester}_${d.exam}`);
  return `${base.slice(0, 150)}.pdf`;
}

/** file_path convention: "<bucket>/<path inside bucket>" (D4). */
export function splitSlug(slug: string): { bucket: string; path: string } {
  const i = slug.indexOf("/");
  return i < 0 ? { bucket: "", path: slug } : { bucket: slug.slice(0, i), path: slug.slice(i + 1) };
}

/** Where a trashed upload's file is parked so it stops being publicly reachable. */
export const trashPath = (id: number) => `trash/${id}.pdf`;
