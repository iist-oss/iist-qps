// Daily digest: ONE email to every admin when papers are waiting for review (nothing is sent when the queue is empty).
// Called once a day by .github/workflows/digest.yml (POST + header `x-webhook-secret`, same value as WEBHOOK_SECRET).
// verify_jwt is off for this function (supabase/config.toml); the shared secret is the lock.
// Needs the same secrets as notify-upload: SMTP_USER, SMTP_PASS (+ optional SMTP_HOST/PORT/FROM), SITE_URL.
// A missing SMTP setup answers 500 on purpose, so the scheduled run turns red instead of failing silently.
import { createClient } from "npm:@supabase/supabase-js@2";
import { fail, ok, preflight } from "../_shared/cors.ts";
import { digestBody, digestSubject } from "../_shared/digest.ts";
import { adminEmails, sendMail, smtpConfigured } from "../_shared/mail.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return fail("Unauthorized.", 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } });

  const pendingQuery = () => db.from("papers").select("id", { count: "exact", head: true })
    .eq("approve_status", false).eq("is_deleted", false);
  const { count: pending, error: e1 } = await pendingQuery();
  if (e1) return fail("Could not count pending papers.", 500);
  if (!pending) return ok("Nothing waiting; no email sent.");

  const { count: recent } = await pendingQuery()
    .gt("upload_timestamp", new Date(Date.now() - 24 * 3600_000).toISOString());
  const { data: oldest } = await db.from("papers").select("upload_timestamp")
    .eq("approve_status", false).eq("is_deleted", false)
    .order("upload_timestamp", { ascending: true }).limit(1);

  if (!smtpConfigured()) return fail("SMTP_USER / SMTP_PASS are not set; cannot email the digest.", 500);

  let emails: string[];
  try { emails = await adminEmails(db); } catch { return fail("Could not read admins.", 500); }
  if (emails.length === 0) return fail("No admin has an email address.", 500);

  try {
    await sendMail(emails, `Campus QPS: ${digestSubject(pending)}`, digestBody({
      pending,
      newLast24h: recent ?? 0,
      oldestIso: oldest?.[0]?.upload_timestamp ?? null,
      site: Deno.env.get("SITE_URL") ?? "",
    }));
  } catch (e) {
    console.error("SMTP error", e);
    return fail("Email sending failed.", 502);
  }
  return ok(`Digest sent to ${emails.length} admin(s): ${pending} waiting.`);
});
