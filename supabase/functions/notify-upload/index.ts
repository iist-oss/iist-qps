// Database Webhook target for INSERT on public.papers -> email to every admin (+ optional Slack).
// Auth: shared secret in header `x-webhook-secret` (verify_jwt is off for this function).
// Email: Gmail SMTP over port 465 (Supabase blocks outgoing 25/587). Needs secrets SMTP_USER,
// SMTP_PASS (a Gmail app password); SMTP_HOST (default smtp.gmail.com), SMTP_PORT (default 465),
// SMTP_FROM (default SMTP_USER) are optional. Without SMTP_USER/SMTP_PASS the email part is skipped.
// Batch uploads: only the FIRST paper of a 10-minute burst sends an email (no spam, stays under Gmail limits).
// Set the secret NOTIFY_MODE=digest to switch this per-upload email (and Slack) off and rely on the daily-digest function.
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { fail, ok } from "../_shared/cors.ts";

const BURST_MINUTES = 10;

Deno.serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return fail("Unauthorized.", 401);

  if (Deno.env.get("NOTIFY_MODE") === "digest") return ok("Ignored (digest mode: the daily digest is used instead).");

  // deno-lint-ignore no-explicit-any
  let payload: any;
  try { payload = await req.json(); } catch { return fail("Invalid JSON body."); }
  if (payload?.type !== "INSERT" || payload?.table !== "papers") return ok("Ignored.");
  // Bulk imports insert already-approved library papers: nothing to review, so no email.
  if (payload.record?.approve_status === true || payload.record?.from_library === true) return ok("Ignored (not a pending upload).");

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } });

  const rec = payload.record ?? {};
  const label = [rec.course_code, rec.course_name].filter(Boolean).join(" ") || "a paper";
  const site = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
  const reviewUrl = site ? `${site}/#/admin` : "";

  const { count } = await db.from("papers").select("id", { count: "exact", head: true })
    .eq("approve_status", false).eq("is_deleted", false);

  const results: string[] = [];

  // ---- email to admins ----
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  if (smtpUser && smtpPass) {
    const since = new Date(Date.now() - BURST_MINUTES * 60_000).toISOString();
    const { count: recent } = await db.from("papers").select("id", { count: "exact", head: true })
      .eq("approve_status", false).eq("is_deleted", false)
      .gt("upload_timestamp", since).neq("id", rec.id ?? -1);
    if ((recent ?? 0) > 0) {
      results.push("email skipped (burst)");
    } else {
      const { data: admins, error: adminErr } = await db.from("admins").select("user_id");
      if (adminErr) return fail("Could not read admins.", 500);
      const emails: string[] = [];
      for (const a of admins ?? []) {
        const { data } = await db.auth.admin.getUserById(a.user_id);
        if (data?.user?.email) emails.push(data.user.email);
      }
      if (emails.length === 0) {
        results.push("email skipped (no admin emails)");
      } else {
        const client = new SMTPClient({
          connection: {
            hostname: Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com",
            port: Number(Deno.env.get("SMTP_PORT") ?? "465"),
            tls: true,
            auth: { username: smtpUser, password: smtpPass },
          },
        });
        try {
          await client.send({
            from: Deno.env.get("SMTP_FROM") ?? smtpUser,
            to: emails,
            subject: `New paper to review: ${label}`,
            content: `A new paper was uploaded: ${label}\nPapers waiting for approval: ${count ?? "?"}\n${reviewUrl ? `\nReview: ${reviewUrl}\n` : ""}\n(Only the first upload in a ${BURST_MINUTES}-minute burst sends an email.)`,
          });
          results.push(`emailed ${emails.length} admin(s)`);
        } catch (e) {
          console.error("SMTP error", e);
          return fail("Email sending failed.", 502);
        } finally {
          try { await client.close(); } catch { /* ignore */ }
        }
      }
    }
  }

  // ---- optional Slack ----
  const slack = Deno.env.get("SLACK_WEBHOOK_URL");
  if (slack) {
    const text = `🔔 New paper uploaded: ${label}\n${reviewUrl ? `<${reviewUrl}|Review> | ` : ""}Unapproved papers: *${count ?? "?"}*`;
    const res = await fetch(slack, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
    });
    if (!res.ok) return fail(`Slack responded ${res.status}`, 502);
    results.push("slack notified");
  }

  return ok(results.length ? results.join("; ") : "No notification channel configured; skipped.");
});
