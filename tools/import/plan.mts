// Pure helpers for the bulk importer (unit-tested under Node from frontend/tests/import.test.mts).
// Reuses the website's own autofill, catalogue and validation code so imports and uploads agree.
import { detailsFromFilename } from "../../frontend/src/lib/autofill.ts";
import { toForm, type FormDetails } from "../../frontend/src/lib/upload.ts";
import { withCourseName, type Catalogue } from "../../frontend/src/lib/courses.ts";
import { approveProblems, formToFields, normCode } from "../../frontend/src/lib/admin.ts";
import { sanitizePath } from "../../supabase/functions/_shared/validate.ts";
import { university } from "../../frontend/src/config/university.ts";

export interface ManifestRow {
  file: string; course_code?: string; course_name?: string; year?: string; exam?: string; semester?: string; note?: string;
}

/** Minimal CSV line splitter: commas, "quoted, fields" and "" escapes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** CSV with a header row (file,course_code,course_name,year,exam,semester,note) or a JSON array of such objects. */
export function parseManifest(text: string, kind: "csv" | "json"): ManifestRow[] {
  if (kind === "json") {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("The JSON manifest must be an array.");
    return data.filter((r) => r && typeof r.file === "string").map((r) => ({ ...r, file: String(r.file) }));
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const head = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  if (!head.includes("file")) throw new Error('The CSV needs a header row with a "file" column.');
  return lines.slice(1).map((l) => {
    const cells = splitCsvLine(l);
    const row: Record<string, string> = {};
    head.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row as unknown as ManifestRow;
  });
}

const opts = { courseCodePattern: university.courseCodePattern, semesterAliases: university.semesterAliases };

export interface FilePlan { form: FormDetails; problems: string[] }

/** Details for one file: manifest values win, then the file name, then the course catalogue fills the name. */
export function planFile(fileName: string, manifest: ManifestRow | undefined, catalogue: Catalogue, nowYear: number): FilePlan {
  const base = toForm(detailsFromFilename(fileName, opts));
  const m = manifest ?? { file: fileName };
  const pick = (v: string | undefined, fallback: string) => (v !== undefined && v.trim() !== "" ? v.trim() : fallback);
  const sem = pick(m.semester, base.semester).toLowerCase();
  const form: FormDetails = withCourseName({
    course_code: pick(m.course_code, base.course_code),
    course_name: pick(m.course_name, base.course_name),
    year: pick(m.year, base.year),
    exam: pick(m.exam, base.exam).toLowerCase(),
    semester: sem === "odd" || sem === "even" ? sem : "",
    note: pick(m.note, base.note),
  }, catalogue);
  return { form, problems: approveProblems(form, nowYear) };
}

/** Where an imported (library) PDF lives inside the public `approved` bucket. */
export function libraryObjectName(form: FormDetails, sha256: string): string {
  const f = formToFields(form);
  const base = [f.course_code, f.year, f.semester, f.exam, f.note].map((p) => sanitizePath(String(p))).filter(Boolean).join("_").slice(0, 120);
  return `library/${base}_${sha256.slice(0, 8)}.pdf`;
}

export { normCode };
