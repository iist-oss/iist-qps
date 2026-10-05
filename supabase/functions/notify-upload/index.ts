import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { fail, ok } from "../_shared/cors.ts";

const BURST_MINUTES = 10;

Deno.serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return fail("Unauthorized.", 401);

  if (Deno.env.get("NOTIFY_MODE") === "digest") return ok("Ignored (digest mode: the daily digest is used instead).");

  let payload: any;
  try { payload = await req.json(); } catch { return fail("Invalid JSON body."); }
  if (payload?.type !== "INSERT" || payload?.table !== "papers") return ok("Ignored.");
  if (payload.record?.approve_status === true || payload.record?.from_library === true) return ok("Ignored (not a pending upload).");

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } });

  const rec = payload.record ?? {};
  const rawLabel = [rec.course_code, rec.course_name].filter(Boolean).join(" ") || "a paper";
  const label = rawLabel.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 240) || "a paper";
  const site = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
  const reviewUrl = site ? `${site}/#/admin` : "";

  const { count } = await db.from("papers").select("id", { count: "exact", head: true })
    .eq("approve_status", false).eq("is_deleted", false);

  const results: string[] = [];

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
          try { await client.close(); } catch {  }
        }
      }
    }
  }

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
