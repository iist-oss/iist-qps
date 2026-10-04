import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateForm, checkFileBasic, hasPdfMagic, fillBlanks, toForm, emptyForm, filePathFor, objectPathFor, friendlyUploadError,
} from "../src/lib/upload.ts";

const good = { course_code: " ma-101 ", course_name: " Calculus ", year: "2023", exam: "midsem", semester: "odd" as const, note: "" };

test("validateForm ok + normalises", () => {
  const r = validateForm(good, 2026);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value, { course_code: "MA101", course_name: "Calculus", year: 2023, exam: "midsem", semester: "odd", note: "" });
});
test("validateForm errors", () => {
  const r = validateForm({ ...emptyForm() }, 2026);
  assert.ok(!r.ok);
  if (!r.ok) assert.equal(r.errors.length, 3);
  assert.ok(!validateForm({ ...good, year: "2099" }, 2026).ok);
  assert.ok(!validateForm({ ...good, exam: "quiz" }, 2026).ok);
  assert.ok(validateForm({ ...good, exam: "ct4", course_name: "" }, 2026).ok);
  assert.ok(!validateForm({ ...good, note: "x".repeat(201) }, 2026).ok);
});
test("checkFileBasic", () => {
  assert.equal(checkFileBasic({ name: "a.pdf", size: 10, type: "application/pdf" }, 10), null);
  assert.equal(checkFileBasic({ name: "a.PDF", size: 10, type: "" }, 10), null);
  assert.match(checkFileBasic({ name: "a.png", size: 10, type: "image/png" }, 10)!, /PDF/);
  assert.match(checkFileBasic({ name: "a.pdf", size: 0, type: "application/pdf" }, 10)!, /empty/);
  assert.match(checkFileBasic({ name: "a.pdf", size: 11 * 1024 * 1024, type: "application/pdf" }, 10)!, /10 MiB/);
});
test("hasPdfMagic", () => {
  assert.ok(hasPdfMagic(new TextEncoder().encode("%PDF-1.7\n...")));
  assert.ok(hasPdfMagic(new TextEncoder().encode("junk\n%PDF-1.4")));
  assert.ok(!hasPdfMagic(new TextEncoder().encode("PK\u0003\u0004 not a pdf")));
  assert.ok(!hasPdfMagic(new Uint8Array(0)));
});
test("fillBlanks keeps what the user typed", () => {
  const f = fillBlanks({ ...emptyForm(), course_code: "EE211" }, { course_code: "MA101", year: 2022, exam: "endsem", semester: "even", note: "Slot A" });
  assert.deepEqual(f, { course_code: "EE211", course_name: "", year: "2022", exam: "endsem", semester: "even", note: "Slot A" });
  assert.equal(toForm({ course_code: "", year: null, exam: "", semester: "", note: "" }).year, "");
});
test("paths match the RLS rule (unapproved/<uid>/...)", () => {
  assert.equal(objectPathFor("u1", "x"), "u1/x.pdf");
  assert.equal(filePathFor("u1", "x"), "unapproved/u1/x.pdf");
});
test("friendlyUploadError", () => {
  assert.match(friendlyUploadError("Daily upload limit reached"), /limit/);
  assert.match(friendlyUploadError('new row violates row-level security policy'), /not allowed/);
  assert.match(friendlyUploadError("TypeError: Failed to fetch"), /Network/);
  assert.match(friendlyUploadError("???"), /Upload failed/);
});
