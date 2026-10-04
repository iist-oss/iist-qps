import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";
import { fail } from "./cors.ts";

export interface AdminCtx {
  user: User;
  /** service-role client: bypasses RLS. Only use AFTER the admin check passed. */
  db: SupabaseClient;
}

/** Verifies the caller's JWT and that they are listed in public.admins. */
export async function requireAdmin(req: Request): Promise<AdminCtx | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return fail("Authorization header missing.", 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return fail("Invalid or expired session.", 401);

  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: row, error: adminErr } = await db
    .from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (adminErr) return fail("Could not verify admin status.", 500);
  if (!row) return fail("Admin access required.", 403);

  return { user: data.user, db };
}
