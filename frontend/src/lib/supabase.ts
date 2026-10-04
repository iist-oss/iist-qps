import { createClient } from "@supabase/supabase-js";
import { configProblems } from "./diagnose";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);
/** Non-empty when the build has a malformed URL/key (shown as a banner on every page). */
export const configIssues: string[] = isConfigured ? configProblems(url, key) : [];

// PKCE flow returns ?code=... in the query string instead of #access_token=..., which
// would collide with HashRouter's use of the URL hash (D5).
export const supabase = createClient(url ?? "http://localhost:54321", key ?? "missing-key", {
  auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
});
