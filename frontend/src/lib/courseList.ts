// Pure helpers (unit-tested under Node): turn a pasted course list into { code, name } rows.
export interface CourseRow { code: string; name: string; sem?: number }
export interface ParsedCourseList { rows: CourseRow[]; skipped: string[] }

const CODE = /(^|[^A-Za-z0-9])([A-Za-z]{2,4}\s?-?\d{3,5}[A-Za-z]?)(?![A-Za-z0-9])/;
const normalizeCode = (s: string) => s.replace(/[\s-]+/g, "").toUpperCase();
const VALID = /^[A-Z]{2,4}\d{3,5}[A-Z]?$/;

// Heading lines like "Semester 2", "Sem-III", "2nd Semester" set the semester number of the course lines below them.
const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
const HEADING_A = /^[\s#*_=|:.\-–—]*(?:semester|sem)\b[\s:.#\-–—]*(\d{1,2}|[ivxIVX]{1,4})(?![A-Za-z0-9])/i;
const HEADING_B = /^[\s#*_=|:.\-–—]*(\d{1,2})(?:st|nd|rd|th)\s+sem(?:ester)?\b/i;
function headingSemester(line: string): number | null {
  const m = HEADING_A.exec(line) ?? HEADING_B.exec(line);
  if (!m) return null;
  const raw = m[1];
  const n = /^\d+$/.test(raw) ? Number(raw) : ROMAN[raw.toUpperCase()];
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}

function cleanName(raw: string): string {
  let n = raw.replace(/^[\s\-–—:|,.)]+/, "");
  n = n.replace(/\s*\(\s*\d+\s*(credits?|cr)?\s*\)\s*$/i, "");          // "(4 credits)"
  n = n.replace(/\s+\d+\s*-\s*\d+\s*-\s*\d+(\s*-\s*\d+)?\s*$/, "");     // "3-1-0-4" (L-T-P-C)
  n = n.replace(/\s+\d{1,2}\s*credits?\s*$/i, "");
  return n.replace(/\s+/g, " ").replace(/[\s\-–—:|,.]+$/, "").trim();
}

/** First column after the code: tab-separated, comma-separated (CSV), or the rest of the line. */
function nameAfterCode(rest: string): string {
  if (rest.includes("\t")) return cleanName(rest.split("\t").map((s) => s.trim()).find((s) => s !== "") ?? "");
  const t = rest.trimStart();
  if (t.startsWith(",")) {
    const m = t.slice(1).trimStart().match(/^"([^"]*)"|^([^,]*)/);
    return cleanName(m ? (m[1] ?? m[2] ?? "") : "");
  }
  return cleanName(rest);
}

export function parseCourseList(text: string): ParsedCourseList {
  const byCode = new Map<string, { name: string; sem?: number }>();
  const skipped: string[] = [];
  let sem: number | undefined; // set by the latest heading line
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;
    const m = CODE.exec(line);
    const code = m ? normalizeCode(m[2]) : "";
    if (!m || !VALID.test(code)) {
      const h = headingSemester(line);
      if (h !== null) { sem = h; continue; }
      skipped.push(line);
      continue;
    }
    const name = nameAfterCode(line.slice(m.index + m[1].length + m[2].length)).slice(0, 200);
    if (name === "") { skipped.push(line); continue; }
    byCode.set(code, sem === undefined ? { name } : { name, sem }); // a repeated code: the last line wins
  }
  const rows: CourseRow[] = [...byCode].map(([code, v]) => ({ code, ...v })).sort((a, b) => a.code.localeCompare(b.code));
  return { rows, skipped };
}
