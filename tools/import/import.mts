// Bulk importer: a folder of PDFs -> checked, de-duplicated, uploaded and approved as LIBRARY papers.
// Needs Node 22.6+ and NO npm packages.
//   export SUPABASE_URL=https://<ref>.supabase.co
//   export SUPABASE_SERVICE_KEY=<service_role key>      (secret: never commit it, never paste it in chat)
//   node --experimental-strip-types tools/import/import.mts <folder> [--manifest list.csv|list.json] [--dry-run] [--allow-similar]
// A paper is imported only if every detail is complete (code, name, year, exam, semester). Anything incomplete,
// an identical file already on the site (SHA-256), or a probable duplicate is SKIPPED and listed. Nothing aborts the run.
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, join } from "node:path";
import { courseCatalogue } from "../../frontend/src/config/courses.ts";
import { university } from "../../frontend/src/config/university.ts";
import { checkFileBasic, hasPdfMagic } from "../../frontend/src/lib/upload.ts";
import { findSimilar, formToFields, type AdminPaper } from "../../frontend/src/lib/admin.ts";
import { libraryObjectName, parseManifest, planFile, type ManifestRow } from "./plan.mts";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const value = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const folder = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--manifest");
const dry = flag("--dry-run");
const allowSimilar = flag("--allow-similar");
if (!folder) { console.error("Usage: import.mts <folder> [--manifest file] [--dry-run] [--allow-similar]"); process.exit(2); }

const url = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_KEY ?? "";
const online = Boolean(url && key);
if (!online && !dry) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY, or use --dry-run."); process.exit(2); }
if (!online) console.log("(No SUPABASE_URL / SUPABASE_SERVICE_KEY: database checks are skipped in this dry run.)");

const H = { apikey: key, Authorization: `Bearer ${key}` };
async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`${path.split("?")[0]}: HTTP ${r.status}`);
  return (await r.json()) as T;
}

let catalogue: Record<string, string> = { ...courseCatalogue };
if (online) {
  try { for (const c of await rest<{ code: string; name: string }[]>("courses?select=code,name&limit=5000")) catalogue[c.code] = c.name; }
  catch (e) { console.log(`(Could not read the course list from the database: ${(e as Error).message}. Using the built-in list.)`); }
}

let manifest = new Map<string, ManifestRow>();
const mPath = value("--manifest");
if (mPath) {
  const rows = parseManifest(await readFile(mPath, "utf8"), mPath.toLowerCase().endsWith(".json") ? "json" : "csv");
  manifest = new Map(rows.map((r) => [r.file.toLowerCase(), r]));
  console.log(`Manifest: ${rows.length} row(s).`);
}

const files = (await readdir(folder)).filter((f) => extname(f).toLowerCase() === ".pdf").sort();
console.log(`${files.length} PDF file(s) in ${folder}${dry ? " (dry run: nothing is uploaded)" : ""}\n`);

const tally: Record<string, number> = {};
const note = (status: string, file: string, detail = "") => {
  tally[status] = (tally[status] ?? 0) + 1;
  console.log(`${status.padEnd(18)} ${file}${detail ? "  " + detail : ""}`);
};
const nowYear = new Date().getFullYear();

for (const file of files) {
  try {
    const bytes = await readFile(join(folder, file));
    const basic = checkFileBasic({ name: file, size: bytes.length, type: "application/pdf" }, university.maxFileMiB);
    if (basic) { note("skipped-file", file, basic); continue; }
    if (!hasPdfMagic(new Uint8Array(bytes.subarray(0, 1024)))) { note("skipped-file", file, "not a real PDF"); continue; }

    const { form, problems } = planFile(file, manifest.get(file.toLowerCase()), catalogue, nowYear);
    if (problems.length) { note("skipped-incomplete", file, problems.join(" ")); continue; }

    const hash = createHash("sha256").update(bytes).digest("hex");
    const d = formToFields(form);
    if (online) {
      const same = await rest<{ id: number }[]>(`papers?file_hash=eq.${hash}&select=id&limit=1`);
      if (same.length) { note("skipped-same-file", file, `already on the site as #${same[0].id}`); continue; }
      if (!allowSimilar) {
        const rows = await rest<AdminPaper[]>(`papers?course_code=eq.${d.course_code}&year=eq.${d.year}&is_deleted=eq.false&select=id,course_code,year,exam,semester,note,is_deleted`);
        const sim = findSimilar({ id: -1, course_code: d.course_code, year: d.year, exam: d.exam, semester: d.semester, note: d.note }, rows);
        if (sim.length) { note("skipped-similar", file, `looks like #${sim.map((s) => s.id).join(", #")} (use --allow-similar to import anyway)`); continue; }
      }
    }
    const objectName = libraryObjectName(form, hash);
    const label = `${d.course_code} ${d.exam} ${d.year} ${d.semester}${d.note ? " (" + d.note + ")" : ""} -> approved/${objectName}`;
    if (dry) { note("would-import", file, label); continue; }

    const up = await fetch(`${url}/storage/v1/object/approved/${objectName}`, {
      method: "POST", headers: { ...H, "Content-Type": "application/pdf", "x-upsert": "false" }, body: bytes,
    });
    if (!up.ok) { note("failed", file, `upload HTTP ${up.status}: ${(await up.text()).slice(0, 120)}`); continue; }
    const ins = await fetch(`${url}/rest/v1/papers`, {
      method: "POST", headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ ...d, file_path: `approved/${objectName}`, from_library: true, file_hash: hash, approve_status: true }),
    });
    if (!ins.ok) {
      await fetch(`${url}/storage/v1/object/approved/${objectName}`, { method: "DELETE", headers: H }); // roll back the file
      note("failed", file, `row insert HTTP ${ins.status}: ${(await ins.text()).slice(0, 120)}`);
      continue;
    }
    note("imported", file, label);
  } catch (e) {
    note("failed", file, (e as Error).message);
  }
}
console.log("\nSummary: " + (Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(", ") || "nothing to do"));
