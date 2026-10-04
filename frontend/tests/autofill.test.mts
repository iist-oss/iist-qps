import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractDetails, detailsFromFilename, mergeDetected, findCourseCode, findExam, findSemester, findYear, findNote,
} from "../src/lib/autofill.ts";

const opts = {
  courseCodePattern: /[A-Za-z]{2,4}\s?-?\d{3,5}/,
  semesterAliases: { odd: "odd", autumn: "odd", monsoon: "odd", even: "even", spring: "even" } as Record<string, "odd" | "even">,
  maxYear: 2027,
};

test("course code: normalises, skips look-alikes", () => {
  assert.equal(findCourseCode("Course: ma 101 Mid Semester", opts.courseCodePattern), "MA101");
  assert.equal(findCourseCode("Page 3 of 2023 ... PH-101", opts.courseCodePattern), "PH101");
  assert.equal(findCourseCode("Roll No 1234 Year 2023", opts.courseCodePattern), "");
  assert.equal(findCourseCode("nothing here", opts.courseCodePattern), "");
});
test("year", () => {
  assert.equal(findYear("Exam held in 2023-24", 2027), 2023);
  assert.equal(findYear("room 12345 and 2099", 2027), null);
  assert.equal(findYear("Dated 12/03/2021", 2027), 2021);
});
test("exam: earliest match wins", () => {
  assert.equal(findExam("Mid Semester Examination"), "midsem");
  assert.equal(findExam("END-SEM exam, not mid sem"), "endsem");
  assert.equal(findExam("Class Test 2"), "ct2");
  assert.equal(findExam("class test"), "ct");
  assert.equal(findExam("CT-3 paper"), "ct3");
  assert.equal(findExam("Final Examination"), "endsem");
  assert.equal(findExam("random"), "");
});
test("semester", () => {
  assert.equal(findSemester("Autumn Semester 2023", opts.semesterAliases), "odd");
  assert.equal(findSemester("Semester: Even", opts.semesterAliases), "even");
  assert.equal(findSemester("Spring 2022", opts.semesterAliases), "even");
  assert.equal(findSemester("even if you try", opts.semesterAliases), "");
  assert.equal(findSemester("anything", {}), "");
});
test("note", () => {
  assert.equal(findNote("Slot B  Supplementary exam"), "Slot B, Supplementary");
  assert.equal(findNote("slot machine"), "");
  assert.equal(findNote("Make-up test"), "Make-up");
});
test("extractDetails on a full header", () => {
  const d = extractDetails("Indian Institute ... MA101 Calculus\nMid Semester Examination, Autumn Semester 2023\nSlot A", opts);
  assert.deepEqual(d, { course_code: "MA101", year: 2023, exam: "midsem", semester: "odd", note: "Slot A" });
});
test("filename parsing and merge", () => {
  const f = detailsFromFilename("PH101_endsem_2022.pdf", opts);
  assert.deepEqual(f, { course_code: "PH101", year: 2022, exam: "endsem", semester: "", note: "" });
  const t = extractDetails("Spring Semester 2021", opts);
  const m = mergeDetected(f, t);
  assert.equal(m.year, 2022);      // filename wins
  assert.equal(m.semester, "even"); // text fills the blank
});
