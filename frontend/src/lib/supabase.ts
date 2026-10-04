import { createClient } from "@supabase/supabase-js";
import { configProblems } from "./diagnose";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);
export const configIssues: string[] = isConfigured ? configProblems(url, key) : [];

export const supabase = createClient(url ?? "http://localhost:54321", key ?? "missing-key", {
  auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
});
