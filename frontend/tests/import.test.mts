import { test } from "node:test";
import assert from "node:assert/strict";
import { libraryObjectName, parseManifest, planFile } from "../../tools/import/plan.mts";
import { courseCatalogue } from "../src/config/courses.ts";

test("csv manifest with quotes and blanks", () => {
  const rows = parseManifest('file,course_code,course_name,year,exam\nq.pdf,AV111C,"Basic Electrical, Part 1",2024,ct\nb.pdf,,,,', "csv");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].course_name, "Basic Electrical, Part 1");
  assert.equal(rows[1].file, "b.pdf");
  assert.throws(() => parseManifest("a,b\n1,2", "csv"));
});

test("json manifest", () => {
  assert.deepEqual(parseManifest('[{"file":"a.pdf","year":"2024"},{"nofile":1}]', "json"), [{ file: "a.pdf", year: "2024" }]);
});

test("a well named file is complete, name from the catalogue", () => {
  const p = planFile("MA111C_midsem_2024_odd-semester.pdf", undefined, courseCatalogue, 2026);
  assert.deepEqual(p.problems, []);
  assert.equal(p.form.course_name, "Calculus");
  assert.equal(p.form.exam, "midsem");
  assert.equal(p.form.semester, "odd");
});

test("missing exam type is reported, manifest can supply it", () => {
  const bare = planFile("AV111C_quiz_2024_odd-semester.pdf", undefined, courseCatalogue, 2026);
  assert.ok(bare.problems.some((x) => /exam/i.test(x)));
  const fixed = planFile("AV111C_quiz_2024_odd-semester.pdf", { file: "x", exam: "CT" }, courseCatalogue, 2026);
  assert.deepEqual(fixed.problems, []);
  assert.equal(fixed.form.exam, "ct");
});

test("object names are stable, safe and unique per file", () => {
  const f = planFile("PH112C_endsem_2023_even-semester.pdf", undefined, courseCatalogue, 2026).form;
  const a = libraryObjectName(f, "abcdef0123456789");
  assert.equal(a, "library/PH112C_2023_even_endsem_abcdef01.pdf");
  assert.notEqual(a, libraryObjectName(f, "ffffff0123456789"));
  assert.match(a, /^library\/[A-Za-z0-9_-]+_[0-9a-f]{8}\.pdf$/);
});
