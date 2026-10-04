export type SemesterValue = "" | "odd" | "even";

export interface Detected {
  course_code: string;
  year: number | null;
  exam: string;
  semester: SemesterValue;
  note: string;
}

export interface AutofillOptions {
  courseCodePattern: RegExp;
  semesterAliases: Record<string, "odd" | "even">;
  maxYear?: number;
}

export const EMPTY_DETECTED: Detected = { course_code: "", year: null, exam: "", semester: "", note: "" };

const FINAL_CODE_RE = /^([A-Z]{2,4})(\d{3,5})([A-Z]?)$/;
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
    if (digits.length === 4 && /^(19|20)\d\d$/.test(digits)) continue;
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
  [/\bsem(?:ester)?[\s_\u2013\u2014-]*end\b/i, () => "endsem"],
  [/\b(?:unit|periodical|surprise)[\s_\u2013\u2014-]*test(?:[\s_\u2013\u2014-]*(?:no\.?\s*)?(IV|V|III|II|I|[1-9])\b)?/i, (m) => "ct" + (m[1] ? (ROMAN[m[1].toUpperCase()] ?? m[1]) : "")],
  [/\bquiz\b(?:[\s_\u2013\u2014-]*(?:no\.?\s*)?(IV|V|III|II|I|[1-9])\b)?/i, (m) => "ct" + (m[1] ? (ROMAN[m[1].toUpperCase()] ?? m[1]) : "")],
  [/\bclass[\s_\u2013\u2014-]*test(?:[\s_\u2013\u2014-]*(?:no\.?\s*)?(\d))?/i, (m) => "ct" + (m[1] ?? "")],
  [/\bct[\s_\u2013\u2014-]?(\d)\b/i, (m) => "ct" + m[1]],
  [/\btest[\s_\u2013\u2014-]*(?:no\.?\s*)?(IV|V|III|II|I|[1-9])\b/i, (m) => "ct" + (ROMAN[m[1].toUpperCase()] ?? m[1])],
];

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
  const adj = new RegExp(
    `\\b(${alt})\\b[\\s:,_-]*(?:semester|sem)\\b|\\b(?:semester|sem)\\b[\\s:,_-]*\\b(${alt})\\b`, "i");
  const m = adj.exec(text);
  if (m) {
    const w = (m[1] ?? m[2]).toLowerCase();
    return aliases[w] ?? "";
  }
  const bareWords = words.filter((w) => w !== "even" && w !== "odd");
  if (bareWords.length === 0) return "";
  const bare = new RegExp(`\\b(${bareWords.map(escapeRe).join("|")})\\b`, "i").exec(text);
  return bare ? (aliases[bare[1].toLowerCase()] ?? "") : "";
}

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
      if (/^[A-Za-z]+$/.test(t) && t !== t.toUpperCase()) continue;
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

export function detailsFromFilename(name: string, opts: AutofillOptions): Detected {
  const cleaned = name.replace(/\.pdf$/i, "").replace(/[_.]+/g, " ");
  const d = extractDetails(cleaned, opts);
  if (d.exam === "" && /(^|[\s-])ct([\s-]|$)/i.test(cleaned)) d.exam = "ct";
  return d;
}

export function mergeDetected(primary: Detected, fallback: Detected): Detected {
  return {
    course_code: primary.course_code || fallback.course_code,
    year: primary.year ?? fallback.year,
    exam: primary.exam || fallback.exam,
    semester: primary.semester || fallback.semester,
    note: primary.note || fallback.note,
  };
}
