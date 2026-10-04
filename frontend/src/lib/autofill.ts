// Pure autofill logic (no React/Supabase/config imports) so it runs under plain Node tests.
// Patterns come in through `opts` (from src/config/university.ts) – see D7, D12.
export type SemesterValue = "" | "odd" | "even";

export interface Detected {
  course_code: string;
  year: number | null;
  exam: string; // '' | midsem | endsem | lab | assignment | ct | ct<N>
  semester: SemesterValue;
  note: string;
}

export interface AutofillOptions {
  courseCodePattern: RegExp;
  semesterAliases: Record<string, "odd" | "even">;
  /** Latest plausible year (default: current year + 1). */
  maxYear?: number;
}

export const EMPTY_DETECTED: Detected = { course_code: "", year: null, exam: "", semester: "", note: "" };

// Institute codes: 2-4 letters, 3-5 digits, optional 1-letter suffix (MA111C, CH112H, AA131V). Keep in sync with config + validate.ts
const FINAL_CODE_RE = /^([A-Z]{2,4})(\d{3,5})([A-Z]?)$/;
// Words that look like a course-code prefix ("Page 12 of 2023") but are not.
const CODE_STOPWORDS = new Set([
  "YEAR", "DATE", "DATED", "PAGE", "PAGES", "TIME", "MARK", "MARKS", "ROLL", "NO", "OF", "IN", "ON", "TO",
  "AT", "BY", "FOR", "SEM", "EXAM", "TEST", "TOTAL", "FULL", "PART", "SET", "QUES", "NOTE", "AND", "THE",
  "OUT", "MAX", "DAY", "SLOT", "CT", "QN", "SEC",
]);

export const normalizeCode = (s: string) => s.replace(/[\s-]+/g, "").toUpperCase();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function findCourseCode(text: string, pattern: RegExp): string {
  const re = new RegExp(`(?<![A-Za-z0-9])(?:${pattern.source})(?![A-Za-z0-9])`, "gi");
  for (const m of text.matchAll(re)) {
    const norm = normalizeCode(m[0]);
    if (!FINAL_CODE_RE.test(norm)) continue;
    const parts = FINAL_CODE_RE.exec(norm)!;
    const letters = parts[1];
    const digits = parts[2];
    if (CODE_STOPWORDS.has(letters)) continue;
    if (digits.length === 4 && /^(19|20)\d\d$/.test(digits)) continue; // that is a year
    return norm;
  }
  return "";
}

export function findYear(text: string, maxYear: number): number | null {
  for (const m of text.matchAll(/(?<!\d)(19[5-9]\d|20\d\d)(?!\d)/g)) {
    const y = Number(m[1]);
    if (y <= maxYear) return y;
  }
  return null;
}

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
const EXAM_PATTERNS: Array<[RegExp, (m: RegExpExecArray) => string]> = [
  [/\bmid[\s_\u2013\u2014-]*sem(?:ester)?\b/i, () => "midsem"],
  [/\bmid[\s_\u2013\u2014-]*term\b/i, () => "midsem"],
  [/\bend[\s_\u2013\u2014-]*sem(?:ester)?\b/i, () => "endsem"],
  [/\bend[\s_\u2013\u2014-]*term(?:inal)?\b/i, () => "endsem"],
  [/\bfinal[\s_\u2013\u2014-]*exam(?:ination)?\b/i, () => "endsem"],
  [/\bclass[\s_\u2013\u2014-]*test(?:[\s_\u2013\u2014-]*(?:no\.?\s*)?(\d))?/i, (m) => "ct" + (m[1] ?? "")],
  [/\bct[\s_\u2013\u2014-]?(\d)\b/i, (m) => "ct" + m[1]],
  // "Test I", "TEST-II", "Test 2" (a numbered test = class test N)
  [/\btest[\s_\u2013\u2014-]*(?:no\.?\s*)?(IV|V|III|II|I|[1-9])\b/i, (m) => "ct" + (ROMAN[m[1].toUpperCase()] ?? m[1])],
];

// Non-exam material. Only used when no real exam wording is found, so a midsem header that mentions "Laboratory" stays a midsem.
const EXTRA_PATTERNS: Array<[RegExp, string]> = [
  [/\bassignments?\b/i, "assignment"],
  [/\blab(?:oratory)?\b/i, "lab"],
  [/\bpractical\b/i, "lab"],
  [/\bautocad\b/i, "lab"],
];

function earliest(text: string, patterns: Array<[RegExp, (m: RegExpExecArray) => string]>): string {
  let best: { index: number; value: string } | null = null;
  for (const [re, toValue] of patterns) {
    const m = re.exec(text);
    if (m && (best === null || m.index < best.index)) best = { index: m.index, value: toValue(m) };
  }
  return best?.value ?? "";
}

export function findExam(text: string): string {
  return earliest(text, EXAM_PATTERNS) ||
    earliest(text, EXTRA_PATTERNS.map(([re, v]): [RegExp, (m: RegExpExecArray) => string] => [re, () => v]));
}

export function findSemester(text: string, aliases: Record<string, "odd" | "even">): SemesterValue {
  const words = Object.keys(aliases);
  if (words.length === 0) return "";
  const alt = words.map(escapeRe).join("|");
  // 1) a semester word right next to "semester"/"sem": "Autumn Semester", "Semester: Even"
  const adj = new RegExp(
    `\\b(${alt})\\b[\\s:,_-]*(?:semester|sem)\\b|\\b(?:semester|sem)\\b[\\s:,_-]*\\b(${alt})\\b`, "i");
  const m = adj.exec(text);
  if (m) {
    const w = (m[1] ?? m[2]).toLowerCase();
    return aliases[w] ?? "";
  }
  // 2) bare season names only ("even"/"odd" alone are too common in ordinary text)
  const bareWords = words.filter((w) => w !== "even" && w !== "odd");
  if (bareWords.length === 0) return "";
  const bare = new RegExp(`\\b(${bareWords.map(escapeRe).join("|")})\\b`, "i").exec(text);
  return bare ? (aliases[bare[1].toLowerCase()] ?? "") : "";
}

/**
 * "B.Tech - I Semester", "1st Semester", "Semester 5": semester 1,3,5,7 = odd, 2,4,6,8 = even (D12).
 * Roman numerals must be written in capitals so ordinary words ("i semester") do not count.
 */
export function findSemesterByNumber(text: string): SemesterValue {
  const tok = "(VIII|VII|VI|IV|V|III|II|I|[1-8])";
  const sem = "(?:semester|sem)(?![a-z])";
  const forms = [
    new RegExp(`(?<![A-Za-z0-9])${tok}(?:st|nd|rd|th)?[\\s.\\u2013\\u2014-]*${sem}`, "gi"),
    new RegExp(`(?<![A-Za-z])${sem}[\\s:.\\u2013\\u2014-]*${tok}(?![A-Za-z0-9])`, "gi"),
  ];
  for (const re of forms) {
    for (const m of text.matchAll(re)) {
      const t = m[1];
      if (/^[A-Za-z]+$/.test(t) && t !== t.toUpperCase()) continue; // "i semester" is not a numeral
      const n = ROMAN[t.toUpperCase()] ?? Number(t);
      if (n >= 1 && n <= 8) return n % 2 === 1 ? "odd" : "even";
    }
  }
  return "";
}

export function findNote(text: string): string {
  const parts: string[] = [];
  const slot = /\b[Ss]lot[\s:_-]*([A-Z])\b/.exec(text);
  if (slot) parts.push(`Slot ${slot[1]}`);
  const sup = /\b(supplementary|supply|make[\s-]?up|re[\s-]?exam)\b/i.exec(text);
  if (sup) {
    const w = sup[1].toLowerCase();
    parts.push(w.startsWith("make") ? "Make-up" : w.startsWith("re") ? "Re-exam" : "Supplementary");
  }
  // "Exercise-1", "Exercise IV", "Experiment 3", "Assignment 2": numbered material (labs/assignments) is not a duplicate of its siblings.
  const num = /\b(exercise|experiment|assignment)\b[\s_\u2013\u2014:#.-]*(\d{1,2}|[ivx]{1,4})(?![A-Za-z0-9])/i.exec(text);
  if (num) {
    const t = num[2];
    const n = /^\d+$/.test(t) ? Number(t) : ROMAN[t.toUpperCase()];
    if (n) parts.push(`${num[1][0].toUpperCase()}${num[1].slice(1).toLowerCase()} ${n}`);
  }
  return parts.join(", ").slice(0, 200);
}

export function extractDetails(text: string, opts: AutofillOptions): Detected {
  const maxYear = opts.maxYear ?? new Date().getFullYear() + 1;
  return {
    course_code: findCourseCode(text, opts.courseCodePattern),
    year: findYear(text, maxYear),
    exam: findExam(text),
    semester: findSemester(text, opts.semesterAliases) || findSemesterByNumber(text),
    note: findNote(text),
  };
}

/** File names like `MA101_midsem_2023.pdf` -> details (underscores/dots count as spaces). */
export function detailsFromFilename(name: string, opts: AutofillOptions): Detected {
  const cleaned = name.replace(/\.pdf$/i, "").replace(/[_.]+/g, " ");
  const d = extractDetails(cleaned, opts);
  // A bare "ct" word is only trusted in file names ("PH112C_ct_2024.pdf"); in paper text it could mean "CT scan".
  if (d.exam === "" && /(^|[\s-])ct([\s-]|$)/i.test(cleaned)) d.exam = "ct";
  return d;
}

/** Fill only what `primary` left blank. */
export function mergeDetected(primary: Detected, fallback: Detected): Detected {
  return {
    course_code: primary.course_code || fallback.course_code,
    year: primary.year ?? fallback.year,
    exam: primary.exam || fallback.exam,
    semester: primary.semester || fallback.semester,
    note: primary.note || fallback.note,
  };
}
