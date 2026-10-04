import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCourseList } from "../src/lib/courseList.ts";

test("plain lines, separators and numbering", () => {
  const r = parseCourseList("MA111C Calculus\nPH112C - Mechanics and Electromagnetism\n3. CH112H: Environmental Science and Engineering");
  assert.deepEqual(r.rows, [
    { code: "CH112H", name: "Environmental Science and Engineering" },
    { code: "MA111C", name: "Calculus" },
    { code: "PH112C", name: "Mechanics and Electromagnetism" },
  ]);
  assert.deepEqual(r.skipped, []);
});

test("credit columns are dropped", () => {
  const r = parseCourseList("MA111C Calculus 3-1-0-4\nES111H\tIntroduction to Space Science\t3\nHS111H Communication Skills I (2 credits)");
  assert.equal(r.rows.find((x) => x.code === "MA111C")?.name, "Calculus");
  assert.equal(r.rows.find((x) => x.code === "ES111H")?.name, "Introduction to Space Science");
  assert.equal(r.rows.find((x) => x.code === "HS111H")?.name, "Communication Skills I");
});

test("csv lines, quotes and lower-case codes", () => {
  const r = parseCourseList('ma111c,Calculus,4\nAV111C,"Basic Electrical Engineering, Part 1",3');
  assert.equal(r.rows.find((x) => x.code === "MA111C")?.name, "Calculus");
  assert.equal(r.rows.find((x) => x.code === "AV111C")?.name, "Basic Electrical Engineering, Part 1");
});

test("lines without a code or name are reported, repeats collapse", () => {
  const r = parseCourseList("Semester 2\nMA121C\nMA121C Linear Algebra\nMA121C Linear Algebra and Geometry\n\nCode Title");
  assert.deepEqual(r.rows, [{ code: "MA121C", name: "Linear Algebra and Geometry", sem: 2 }]);
  assert.deepEqual(r.rows.map((x) => x.sem), [2]); // the "Semester 2" heading is not skipped any more
  assert.deepEqual(r.skipped, ["MA121C", "Code Title"]);
});

test("semester headings set the semester number of the lines below", () => {
  const r = parseCourseList("Semester 2\nMA121C Linear Algebra\nPH121C Waves\n\nSem III\nCS201C Data Structures\n2nd Semester\nXX\n4th semester\nEE401C Control Systems");
  assert.deepEqual(r.rows, [
    { code: "CS201C", name: "Data Structures", sem: 3 },
    { code: "EE401C", name: "Control Systems", sem: 4 },
    { code: "MA121C", name: "Linear Algebra", sem: 2 },
    { code: "PH121C", name: "Waves", sem: 2 },
  ]);
  assert.deepEqual(r.skipped, ["XX"]);
});

test("lines before any heading have no semester; bad headings are skipped, not applied", () => {
  const r = parseCourseList("MA111C Calculus\nSemester 99\nPH112C Mechanics\nSemester project guidelines");
  assert.deepEqual(r.rows, [{ code: "MA111C", name: "Calculus" }, { code: "PH112C", name: "Mechanics" }]);
  assert.deepEqual(r.skipped, ["Semester 99", "Semester project guidelines"]);
});

test("a course line that mentions a semester is still a course", () => {
  const r = parseCourseList("Semester 1\nMA111C Calculus for Semester 1 students");
  assert.deepEqual(r.rows, [{ code: "MA111C", name: "Calculus for Semester 1 students", sem: 1 }]);
});
