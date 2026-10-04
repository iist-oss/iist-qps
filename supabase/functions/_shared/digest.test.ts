import { assertEquals } from "jsr:@std/assert@1";
import { digestBody, digestSubject, waitingLabel } from "./digest.ts";

const now = new Date("2026-10-05T12:00:00Z");

Deno.test("waitingLabel", () => {
  assertEquals(waitingLabel(null, now), "");
  assertEquals(waitingLabel("garbage", now), "");
  assertEquals(waitingLabel("2026-10-05T11:59:30Z", now), "1 minute");
  assertEquals(waitingLabel("2026-10-05T11:40:00Z", now), "20 minutes");
  assertEquals(waitingLabel("2026-10-05T11:00:00Z", now), "1 hour");
  assertEquals(waitingLabel("2026-10-05T07:00:00Z", now), "5 hours");
  assertEquals(waitingLabel("2026-10-02T12:00:00Z", now), "3 days");
});
Deno.test("digestSubject is singular/plural", () => {
  assertEquals(digestSubject(1), "1 paper waiting for review");
  assertEquals(digestSubject(7), "7 papers waiting for review");
});
Deno.test("digestBody", () => {
  const b = digestBody({ pending: 3, newLast24h: 2, oldestIso: "2026-10-03T12:00:00Z", site: "https://x.github.io/iist-qps/", now });
  assertEquals(b.includes("3 papers waiting for review."), true);
  assertEquals(b.includes("New in the last 24 hours: 2."), true);
  assertEquals(b.includes("waiting 2 days"), true);
  assertEquals(b.includes("Review: https://x.github.io/iist-qps/#/admin"), true);
  const bare = digestBody({ pending: 1, newLast24h: 0, oldestIso: null, site: "", now });
  assertEquals(bare.includes("New in the last"), false);
  assertEquals(bare.includes("Review:"), false);
});
