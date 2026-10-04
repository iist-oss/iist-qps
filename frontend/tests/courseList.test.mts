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
  assert.deepEqual(r.rows, [{ code: "MA121C", name: "Linear Algebra and Geometry" }]);
  assert.deepEqual(r.skipped, ["Semester 2", "MA121C", "Code Title"]);
});
