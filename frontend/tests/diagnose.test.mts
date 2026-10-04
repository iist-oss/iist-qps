import { test } from "node:test";
import assert from "node:assert/strict";
import { describeKey, refFromUrl, keyProblems } from "../src/lib/diagnose.ts";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (o: object) => `${b64({ alg: "HS256" })}.${b64(o)}.sig`;

test("describeKey reads role and ref from a JWT, never returns the whole key", () => {
  const k = jwt({ role: "anon", ref: "abc123" });
  const i = describeKey(k);
  assert.equal(i.kind, "jwt"); assert.equal(i.role, "anon"); assert.equal(i.ref, "abc123");
  assert.equal(i.prefix.length, 6);
});
test("publishable / secret / missing / junk", () => {
  assert.equal(describeKey("sb_publishable_xyz").kind, "publishable");
  assert.equal(describeKey("sb_secret_xyz").kind, "secret");
  assert.equal(describeKey(undefined).kind, "missing");
  assert.equal(describeKey("not a key").kind, "unknown");
});
test("refFromUrl", () => {
  assert.equal(refFromUrl("https://mebfxiizwzzsjuuqftoy.supabase.co"), "mebfxiizwzzsjuuqftoy");
  assert.equal(refFromUrl("https://mebfxiizwzzsjuuqftoy.supabase.co/"), "mebfxiizwzzsjuuqftoy");
  assert.equal(refFromUrl("https://x.supabase.co/rest/v1"), null);
});
test("keyProblems flags mismatch, service_role, missing", () => {
  const url = "https://mebfxiizwzzsjuuqftoy.supabase.co";
  assert.deepEqual(keyProblems(url, describeKey(jwt({ role: "anon", ref: "mebfxiizwzzsjuuqftoy" }))), []);
  assert.match(keyProblems(url, describeKey(jwt({ role: "anon", ref: "other" })))[0], /belongs to project/);
  assert.match(keyProblems(url, describeKey(jwt({ role: "service_role", ref: "mebfxiizwzzsjuuqftoy" })))[0], /SECRET/);
  assert.ok(keyProblems(undefined, describeKey(undefined)).length >= 2);
  assert.deepEqual(keyProblems(url, describeKey("sb_publishable_abc")), []);
});
