// Pure text helpers for the daily digest email (no Deno APIs, so they are easy to test).

/** "3 days", "5 hours", "20 minutes" - how long the oldest waiting paper has been waiting. */
export function waitingLabel(oldestIso: string | null, now: Date = new Date()): string {
  if (!oldestIso) return "";
  const ms = now.getTime() - new Date(oldestIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${Math.max(min, 1)} minute${min <= 1 ? "" : "s"}`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${Math.floor(h / 24)} days`;
}

export function digestSubject(pending: number): string {
  return `${pending} paper${pending === 1 ? "" : "s"} waiting for review`;
}

export interface DigestInput {
  pending: number;
  newLast24h: number;
  oldestIso: string | null;
  site: string; // "" when SITE_URL is not set
  now?: Date;
}

export function digestBody(i: DigestInput): string {
  const lines = [`${digestSubject(i.pending)}.`];
  if (i.newLast24h > 0) lines.push(`New in the last 24 hours: ${i.newLast24h}.`);
  const wait = waitingLabel(i.oldestIso, i.now);
  if (wait) lines.push(`The oldest has been waiting ${wait}.`);
  const site = i.site.replace(/\/$/, "");
  if (site) lines.push("", `Review: ${site}/#/admin`);
  lines.push("", "(Daily digest. It is only sent when something is waiting.)");
  return lines.join("\n");
}
