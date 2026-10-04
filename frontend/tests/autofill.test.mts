import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractDetails, detailsFromFilename, mergeDetected, findCourseCode, findExam, findSemester, findYear, findNote,
  findSemesterByNumber,
} from "../src/lib/autofill.ts";

const opts = {
  courseCodePattern: /[A-Za-z]{2,4}\s?-?\d{3,5}[A-Za-z]?/,
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

// ---- Real IIST papers (headers transcribed from the Semester 1 2024 scans) ----
const iist = (h: string) => extractDetails(h, opts);
const base = "INDIAN INSTITUTE OF SPACE SCIENCE AND TECHNOLOGY THIRUVANANTHAPURAM 695 547";

test("IIST course codes with a letter suffix", () => {
  assert.equal(findCourseCode("MA111C - Calculus", opts.courseCodePattern), "MA111C");
  assert.equal(findCourseCode("Mechanics and Electromagnetism (PH112C) Mid-Term", opts.courseCodePattern), "PH112C");
  assert.equal(findCourseCode("CH112H ENVIRONMENTAL SCIENCE", opts.courseCodePattern), "CH112H");
  assert.equal(findCourseCode("ES111H: Introduction to Space Science", opts.courseCodePattern), "ES111H");
  assert.equal(findCourseCode("AV 111 Basic Electrical Engineering", opts.courseCodePattern), "AV111");
  assert.equal(findCourseCode("AE131/AV131: Basic Engg. Lab", opts.courseCodePattern), "AE131");
  assert.equal(findCourseCode("ma111c_midsem_2024", opts.courseCodePattern), "MA111C");
  assert.equal(findCourseCode("MA111and more", opts.courseCodePattern), ""); // letters glued to a word are not a suffix
  assert.equal(findCourseCode("Sep 2024 and Page 12", opts.courseCodePattern), "");
});
test("IIST header: MA111C mid term", () => {
  assert.deepEqual(iist(`${base} Mid Term Examination - September 2024 B.Tech - I Semester MA111C - Calculus Date: 23/09/2024 Time: 2 hours Max. Marks: 35`),
    { course_code: "MA111C", year: 2024, exam: "midsem", semester: "odd", note: "" });
});
test("IIST header: Test I (numbered test = ct1)", () => {
  const d = iist(`${base} Test I - September 2024 B.Tech - I Semester MA111 - Calculus Date: 05/09/2024`);
  assert.equal(d.exam, "ct1"); assert.equal(d.course_code, "MA111"); assert.equal(d.semester, "odd"); assert.equal(d.year, 2024);
  assert.equal(findExam("BASIC ELECTRICAL ENGINEERING TEST\u2013I Date :September 09, 2024"), "ct1");
  assert.equal(findExam("Test II"), "ct2");
  assert.equal(findExam("Class test in Physics 20 Sep' 2024"), "ct");
  assert.equal(findExam("this test is hard"), "");
});
test("IIST header: AV111 End Terminal Examination, 1st semester", () => {
  const d = iist(`${base} B Tech (ECE and Engineering Physics) 1st semester End Terminal Examination AV 111 Basic Electrical Engineering Date: 09. 12. 2024`);
  assert.deepEqual(d, { course_code: "AV111", year: 2024, exam: "endsem", semester: "odd", note: "" });
});
test("IIST header: CH112H mid semester and end semester", () => {
  assert.deepEqual(iist("CH112H ENVIRONMENTAL SCIENCE AND ENGINEERING MID SEMESTER EXAMINATION September 28, 2024"),
    { course_code: "CH112H", year: 2024, exam: "midsem", semester: "", note: "" });
  const e = iist("CH112H ENVIRONMENTAL SCIENCE AND ENGINEERING END SEMESTER EXAMINATION B. Tech. I Semester (ECE Branch) December 11, 2024");
  assert.equal(e.exam, "endsem"); assert.equal(e.semester, "odd");
});
test("IIST header: ES111H end sem / PH112C mid-term", () => {
  const e = iist("DEPARTMENT OF EARTH AND SPACE SCIENCES End Semester Examination B.Tech (ECE) 1st Semester Course: ES111H: Introduction to Space Science Max. Marks: 80");
  assert.deepEqual(e, { course_code: "ES111H", year: null, exam: "endsem", semester: "odd", note: "" });
  const p = iist("Tech(I Year) Mechanics and Electromagnetism (PH112C) Mid-Term Sep' 2024 Duration:2 Hrs Full Marks: 30");
  assert.equal(p.course_code, "PH112C"); assert.equal(p.exam, "midsem"); assert.equal(p.year, 2024);
});
test("semester from the semester number", () => {
  assert.equal(findSemesterByNumber("B.Tech - I Semester"), "odd");
  assert.equal(findSemesterByNumber("B.Tech - II Semester"), "even");
  assert.equal(findSemesterByNumber("ECE/Avionics \u20131st Semester"), "odd");
  assert.equal(findSemesterByNumber("4th Sem exam"), "even");
  assert.equal(findSemesterByNumber("Semester 5"), "odd");
  assert.equal(findSemesterByNumber("Semester - VIII"), "even");
  assert.equal(findSemesterByNumber("End Semester Examination"), "");
  assert.equal(findSemesterByNumber("Semester 2024"), "");
  assert.equal(findSemesterByNumber("i semester"), ""); // lower-case "i" is a word, not a numeral
  assert.equal(findSemesterByNumber("Mid Sem"), "");
});

test("lab and assignment papers (non-exam material) are detected, but real exam wording wins", () => {
  assert.equal(findExam("Basic Engineering Lab - AutoCAD exercise"), "lab");
  assert.equal(findExam("Assignment 1 - Mechanics"), "assignment");
  assert.equal(findExam("Mid Semester Examination, Laboratory Block"), "midsem");
  assert.equal(findExam("nothing relevant"), "");
});

test("file names: bare _ct_ means class test; _odd-semester gives the semester", () => {
  const d = detailsFromFilename("PH112C_ct_2024_odd-semester.pdf", opts);
  assert.deepEqual(d, { course_code: "PH112C", year: 2024, exam: "ct", semester: "odd", note: "" });
  assert.equal(findExam("CT scan of the brain"), ""); // paper text is not affected
});

test("numbered exercises get a note (file names and paper text)", () => {
  assert.equal(findNote("AA131V lab 2024 odd-semester Exercise-3"), "Exercise 3");
  assert.equal(findNote("AutoCAD Exercise — Iv"), "Exercise 4");
  assert.equal(findNote("Slot B Exercise 2"), "Slot B, Exercise 2");
  assert.equal(findNote("Mid semester examination"), "");
  const d = detailsFromFilename("AA131V_lab_2024_odd-semester_Exercise-1.pdf", opts);
  assert.equal(d.note, "Exercise 1");
});
