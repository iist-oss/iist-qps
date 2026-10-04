import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseExamFilter, semesterTag, semesterTooltip, examTag, examTooltip,
  paperTitle, availableYears, filterAndSort, formatCount,
} from "../src/lib/papers.ts";

const P = (id: number, name: string, year: number) => ({
  id, file_path: "approved/x.pdf", from_library: false, course_code: "CS10001",
  course_name: name, year, semester: "odd" as const, exam: "endsem", note: "",
});

test("parseExamFilter", () => {
  assert.deepEqual(parseExamFilter(null), ["midsem", "endsem", "ct", "lab", "assignment"]);
  assert.deepEqual(parseExamFilter("ct,bogus,midsem"), ["ct", "midsem"]);
  assert.deepEqual(parseExamFilter(""), []);
});
test("semester labels use odd/even", () => {
  assert.equal(semesterTag("odd"), "ODD");
  assert.equal(semesterTag("even"), "EVEN");
  assert.equal(semesterTag(""), "N/A");
  assert.equal(semesterTooltip("even"), "Even semester");
});
test("exam labels", () => {
  assert.equal(examTag("midsem"), "MID");
  assert.equal(examTag("ct2"), "CT2");
  assert.equal(examTag(""), "Unknown");
  assert.equal(examTooltip("ct"), "Class test ?");
  assert.equal(examTooltip("ct3"), "Class test 3");
});
test("paperTitle", () => {
  assert.equal(paperTitle({ course_name: "Algo", course_code: "CS20001" }), "Algo (CS20001)");
  assert.equal(paperTitle({ course_name: "Algo", course_code: "" }), "Algo");
});
test("filter and sort", () => {
  const rs = [P(1, "B", 2021), P(2, "A", 2023), P(3, "C", 2022), P(4, "A2", 2023)];
  assert.deepEqual(availableYears(rs), [2023, 2022, 2021]);
  assert.deepEqual(filterAndSort(rs, { year: null, sortBy: "relevance", order: "descending" }).map((r) => r.id), [1, 2, 3, 4]);
  assert.deepEqual(filterAndSort(rs, { year: null, sortBy: "year", order: "descending" }).map((r) => r.year), [2023, 2023, 2022, 2021]);
  assert.deepEqual(filterAndSort(rs, { year: null, sortBy: "course_name", order: "ascending" }).map((r) => r.course_name), ["A", "A2", "B", "C"]);
  assert.deepEqual(filterAndSort(rs, { year: 2023, sortBy: "year", order: "descending" }).map((r) => r.course_name), ["A", "A2"]);
  assert.equal(rs[0].id, 1);
});
test("formatCount", () => {
  assert.equal(formatCount(999), "999");
  assert.equal(formatCount(12400), "12k");
});

test("lab and assignment tags and filters", () => {
  assert.equal(examTag("lab"), "LAB");
  assert.equal(examTag("assignment"), "ASSIGN");
  assert.equal(examTooltip("assignment"), "Assignment");
  assert.deepEqual(parseExamFilter("lab,assignment,bogus"), ["lab", "assignment"]);
});
