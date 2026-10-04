// Database Webhook target for INSERT on public.papers  -> Slack message.
// Auth: shared secret in header `x-webhook-secret` (verify_jwt is off for this function).
// No-ops with 200 when SLACK_WEBHOOK_URL is not set. Note: a batch upload of N files sends N messages.
import { createClient } from "npm:@supabase/supabase-js@2";
import { fail, ok } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return fail("Unauthorized.", 401);

  // deno-lint-ignore no-explicit-any
  let payload: any;
  try { payload = await req.json(); } catch { return fail("Invalid JSON body."); }
  if (payload?.type !== "INSERT" || payload?.table !== "papers") return ok("Ignored.");

  const slack = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!slack) return ok("Slack not configured; skipped.");

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } });
  const { count } = await db.from("papers").select("id", { count: "exact", head: true })
    .eq("approve_status", false).eq("is_deleted", false);

  const rec = payload.record ?? {};
  const label = [rec.course_code, rec.course_name].filter(Boolean).join(" ") || "a paper";
  const site = Deno.env.get("SITE_URL") ?? "";
  const text = `🔔 New paper uploaded: ${label}\n${site ? `<${site}/#/admin|Review> | ` : ""}Unapproved papers: *${count ?? "?"}*`;

  const res = await fetch(slack, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
  });
  if (!res.ok) return fail(`Slack responded ${res.status}`, 502);
  return ok("Notified.");
});
