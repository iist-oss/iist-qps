import { assertEquals } from "jsr:@std/assert@1";
import { approvedFileName, normalizeCourseCode, sanitizePath, splitSlug, trashPath, validateDetails } from "./validate.ts";

const good = { course_code: "cs 10001", course_name: "Data Structures", year: 2023, exam: "endsem", semester: "odd", note: "" };

Deno.test("normalizeCourseCode strips spaces/hyphens and uppercases", () => {
  assertEquals(normalizeCourseCode("cs-100 01"), "CS10001");
});
Deno.test("complete valid details pass", () => {
  const r = validateDetails(good, true);
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value.course_code, "CS10001");
});
Deno.test("autumn is rejected (semesters are odd/even)", () => {
  assertEquals(validateDetails({ ...good, semester: "autumn" }, false).ok, false);
});
Deno.test("incomplete details allowed when not approving, rejected when approving", () => {
  const partial = { ...good, course_code: "", exam: "", semester: "", course_name: "" };
  assertEquals(validateDetails(partial, false).ok, true);
  assertEquals(validateDetails(partial, true).ok, false);
});
Deno.test("class test numbers", () => {
  assertEquals(validateDetails({ ...good, exam: "ct3" }, true).ok, true);
  assertEquals(validateDetails({ ...good, exam: "quiz" }, true).ok, false);
});
Deno.test("sanitizePath / approvedFileName", () => {
  assertEquals(sanitizePath("1_CS10001_Data Structures/Intro_2023"), "1_CS10001_Data-Structures-Intro_2023");
  const r = validateDetails(good, true);
  if (r.ok) assertEquals(approvedFileName(7, r.value), "7_CS10001_Data-Structures_2023_odd_endsem.pdf");
});
Deno.test("splitSlug", () => {
  assertEquals(splitSlug("approved/a/b.pdf"), { bucket: "approved", path: "a/b.pdf" });
});
Deno.test("trashPath", () => {
  assertEquals(trashPath(5), "trash/5.pdf");
});
