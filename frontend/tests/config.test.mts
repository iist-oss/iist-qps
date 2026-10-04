import { test } from "node:test";
import assert from "node:assert/strict";
import { university } from "../src/config/university.ts";

test("contact details are well formed", () => {
  assert.match(university.contact.email, /^[^@\s]+@[^@\s]+\.[a-z]+$/i);
  assert.ok(university.contact.issuesUrl.startsWith("https://github.com/iist-oss/iist-qps/issues"));
});

test("credits are filled in", () => {
  assert.ok(university.credits.builderName.trim().length > 2);
  assert.ok(university.credits.builderGithub.startsWith("https://github.com/"));
  assert.ok(university.credits.message.length >= 1);
  assert.ok(university.credits.timeline.length >= 1);
  assert.ok(university.credits.buildSummary.length > 10);
  assert.match(university.credits.message[0], /\bI\b|\bI'm\b/);
});
