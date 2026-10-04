import { test } from "node:test";
import assert from "node:assert/strict";
import { friendlyAuthError, looksLikeEmail, normalizeEmail } from "../src/lib/email.ts";

test("normalizeEmail", () => assert.equal(normalizeEmail("  A@UG.IIST.ac.in "), "a@ug.iist.ac.in"));
test("looksLikeEmail", () => {
  assert.equal(looksLikeEmail("a@iist.ac.in"), true);
  assert.equal(looksLikeEmail("a@iist"), false);
  assert.equal(looksLikeEmail("a b@iist.ac.in"), false);
});
test("friendlyAuthError", () => {
  assert.match(friendlyAuthError("email rate limit exceeded"), /Too many/);
  assert.match(friendlyAuthError("Database error saving new user"), /IIST/);
  assert.match(friendlyAuthError("Token has expired or is invalid"), /wrong or has expired/);
  assert.match(friendlyAuthError("boom"), /Something went wrong/);
});
