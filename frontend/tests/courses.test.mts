import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupCourseName, withCourseName } from "../src/lib/courses.ts";
import { courseCatalogue } from "../src/config/courses.ts";
import { emptyForm } from "../src/lib/upload.ts";

test("exact code, case and spacing", () => {
  assert.equal(lookupCourseName("MA111C", courseCatalogue), "Calculus");
  assert.equal(lookupCourseName(" ma-111 c ", courseCatalogue), "Calculus");
  assert.equal(lookupCourseName("CH112H", courseCatalogue), "Environmental Science and Engineering");
});
test("papers that drop the trailing letter still match when unambiguous", () => {
  assert.equal(lookupCourseName("MA111", courseCatalogue), "Calculus");
  assert.equal(lookupCourseName("AV111", courseCatalogue), "Basic Electrical Engineering");
  assert.equal(lookupCourseName("AV111", { AV111C: "A", AV111D: "B" }), ""); // ambiguous -> no guess
});
test("unknown codes give no name", () => {
  assert.equal(lookupCourseName("PH111C", courseCatalogue), ""); // the typo printed on the PH112C end-sem paper
  assert.equal(lookupCourseName("XX999", courseCatalogue), "");
  assert.equal(lookupCourseName("", courseCatalogue), "");
});
test("withCourseName never overwrites what the person typed", () => {
  assert.equal(withCourseName({ ...emptyForm(), course_code: "MA111C" }, courseCatalogue).course_name, "Calculus");
  assert.equal(withCourseName({ ...emptyForm(), course_code: "MA111C", course_name: "My name" }, courseCatalogue).course_name, "My name");
  assert.equal(withCourseName({ ...emptyForm(), course_code: "ZZ999" }, courseCatalogue).course_name, "");
});
