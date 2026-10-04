import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export async function adminEmails(db: SupabaseClient): Promise<string[]> {
  const { data: admins, error } = await db.from("admins").select("user_id");
  if (error) throw new Error("Could not read admins.");
  const emails: string[] = [];
  for (const a of admins ?? []) {
    const { data } = await db.auth.admin.getUserById(a.user_id);
    if (data?.user?.email) emails.push(data.user.email);
  }
  return emails;
}

export const smtpConfigured = () => Boolean(Deno.env.get("SMTP_USER") && Deno.env.get("SMTP_PASS"));

export async function sendMail(to: string[], subject: string, content: string): Promise<void> {
  const user = Deno.env.get("SMTP_USER")!;
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com",
      port: Number(Deno.env.get("SMTP_PORT") ?? "465"),
      tls: true,
      auth: { username: user, password: Deno.env.get("SMTP_PASS")! },
    },
  });
  try {
    await client.send({ from: Deno.env.get("SMTP_FROM") ?? user, to, subject, content });
  } finally {
    try { await client.close(); } catch {  }
  }
}
