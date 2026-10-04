// Pure helpers (unit-tested under Node): turn a pasted course list into { code, name } rows.
export interface CourseRow { code: string; name: string }
export interface ParsedCourseList { rows: CourseRow[]; skipped: string[] }

const CODE = /(^|[^A-Za-z0-9])([A-Za-z]{2,4}\s?-?\d{3,5}[A-Za-z]?)(?![A-Za-z0-9])/;
const normalizeCode = (s: string) => s.replace(/[\s-]+/g, "").toUpperCase();
const VALID = /^[A-Z]{2,4}\d{3,5}[A-Z]?$/;

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
  const byCode = new Map<string, string>();
  const skipped: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;
    const m = CODE.exec(line);
    const code = m ? normalizeCode(m[2]) : "";
    if (!m || !VALID.test(code)) { skipped.push(line); continue; }
    const name = nameAfterCode(line.slice(m.index + m[1].length + m[2].length)).slice(0, 200);
    if (name === "") { skipped.push(line); continue; }
    byCode.set(code, name); // a repeated code: the last line wins
  }
  const rows = [...byCode].map(([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code));
  return { rows, skipped };
}
