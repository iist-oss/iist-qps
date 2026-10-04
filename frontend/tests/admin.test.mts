import { test } from "node:test";
import assert from "node:assert/strict";
import { ageLabel, approveProblems, bulkProblems, findSimilar, formToFields, paperToForm, type AdminPaper } from "../src/lib/admin.ts";

const base: AdminPaper = {
  id: 1, file_path: "unapproved/u/1.pdf", from_library: false, course_code: "MA111C", course_name: "Calculus",
  year: 2024, semester: "odd", exam: "midsem", note: "", upload_timestamp: "2026-10-05T00:00:00Z", approve_status: false, is_deleted: false,
};

test("paperToForm turns the year into a string", () => {
  assert.deepEqual(paperToForm(base), { course_code: "MA111C", course_name: "Calculus", year: "2024", exam: "midsem", semester: "odd", note: "" });
});

test("approveProblems: complete form has none", () => {
  assert.deepEqual(approveProblems(paperToForm(base), 2026), []);
});

test("approveProblems lists every missing field", () => {
  const p = approveProblems({ course_code: "", course_name: "", year: "", exam: "", semester: "", note: "" }, 2026);
  assert.equal(p.length, 5);
  assert.deepEqual(approveProblems({ ...paperToForm(base), course_name: "Unknown course" }, 2026), ["Course name is required."]);
  assert.equal(approveProblems({ ...paperToForm(base), course_code: "PH111C-x" }, 2026).length, 1);
  assert.equal(approveProblems({ ...paperToForm(base), exam: "lab" }, 2026).length, 0);
  assert.equal(approveProblems({ ...paperToForm(base), year: "2099" }, 2026).length, 1);
});

test("formToFields normalises code, trims and converts year", () => {
  const f = formToFields({ course_code: " ma-111c ", course_name: " Calculus ", year: "2024", exam: "midsem", semester: "odd", note: " Slot A " });
  assert.deepEqual(f, { course_code: "MA111C", course_name: "Calculus", year: 2024, exam: "midsem", semester: "odd", note: "Slot A" });
});

test("findSimilar: same code/year/exam, semester equal or unknown, not itself, not trashed", () => {
  const others: AdminPaper[] = [
    base,                                                       // itself
    { ...base, id: 2 },                                         // duplicate
    { ...base, id: 3, semester: "" },                           // unknown semester still matches
    { ...base, id: 4, semester: "even" },                       // other semester
    { ...base, id: 5, exam: "endsem" },                         // other exam
    { ...base, id: 6, year: 2023 },                             // other year
    { ...base, id: 7, course_code: "ma 111c" },                 // same code, other spelling
    { ...base, id: 8, is_deleted: true },                       // trashed
    { ...base, id: 9, course_code: "PH112C" },                  // other course
  ];
  assert.deepEqual(findSimilar(base, others).map((o) => o.id), [2, 3, 7]);
  assert.deepEqual(findSimilar({ ...base, course_code: "" }, others), []);
});

test("ageLabel", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  assert.equal(ageLabel("2026-10-05T11:59:40Z", now), "just now");
  assert.equal(ageLabel("2026-10-05T11:30:00Z", now), "30 min ago");
  assert.equal(ageLabel("2026-10-05T07:00:00Z", now), "5 h ago");
  assert.equal(ageLabel("2026-10-04T10:00:00Z", now), "1 day ago");
  assert.equal(ageLabel("2026-10-01T12:00:00Z", now), "4 days ago");
  assert.equal(ageLabel("garbage", now), "just now");
});

test("findSimilar: different notes (Exercise 1 vs 2) are different papers; blank note still matches", () => {
  const lab = { ...base, exam: "lab", note: "Exercise 1" };
  const others: AdminPaper[] = [
    { ...lab, id: 2, note: "Exercise 2" },
    { ...lab, id: 3, note: "exercise 1" },
    { ...lab, id: 4, note: "" },
  ];
  assert.deepEqual(findSimilar({ ...lab, id: 1 }, others).map((o) => o.id), [3, 4]);
  assert.deepEqual(findSimilar({ ...lab, id: 1, note: "" }, others).map((o) => o.id), [2, 3, 4]);
});

test("bulkProblems: complete and unique is ready; missing fields and look-alikes are not", () => {
  const form = paperToForm(base);
  assert.deepEqual(bulkProblems(base, form, [base], 2026), []); // itself is ignored
  assert.deepEqual(bulkProblems(base, { ...form, semester: "" }, [], 2026), ["Choose the semester (odd or even)."]);
  const dup = bulkProblems(base, form, [base, { ...base, id: 2 }, { ...base, id: 3 }], 2026);
  assert.deepEqual(dup, ["Possible duplicate of #2, #3."]);
  // different notes = different papers (lab exercises), so no duplicate flag
  const lab = { ...base, exam: "lab", note: "Exercise 1" };
  assert.deepEqual(bulkProblems(lab, paperToForm(lab), [{ ...lab, id: 2, note: "Exercise 2" }], 2026), []);
});
