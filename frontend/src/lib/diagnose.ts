export interface KeyInfo {
  present: boolean;
  length: number;
  prefix: string;
  kind: "jwt" | "publishable" | "secret" | "unknown" | "missing";
  role: string | null;
  ref: string | null;
}

function b64urlToString(s: string): string {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = pad + "=".repeat((4 - (pad.length % 4)) % 4);
  return atob(padded);
}

export function describeKey(key: string | undefined): KeyInfo {
  if (!key) return { present: false, length: 0, prefix: "", kind: "missing", role: null, ref: null };
  const base = { present: true, length: key.length, prefix: key.slice(0, 6), role: null, ref: null };
  if (key.startsWith("sb_publishable_")) return { ...base, kind: "publishable" };
  if (key.startsWith("sb_secret_")) return { ...base, kind: "secret" };
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(b64urlToString(parts[1])) as { role?: string; ref?: string };
      return { ...base, kind: "jwt", role: payload.role ?? null, ref: payload.ref ?? null };
    } catch {  }
  }
  return { ...base, kind: "unknown" };
}

export function refFromUrl(url: string | undefined): string | null {
  const m = /^https?:\/\/([a-z0-9]+)\.supabase\.co\/?$/i.exec((url ?? "").trim());
  return m ? m[1].toLowerCase() : null;
}

export function keyProblems(url: string | undefined, info: KeyInfo): string[] {
  const out: string[] = [];
  if (!url) out.push("VITE_SUPABASE_URL is empty in this build.");
  else if (refFromUrl(url) === null) out.push("The URL does not look like https://<project-ref>.supabase.co (extra slash, space or path?).");
  if (!info.present) { out.push("VITE_SUPABASE_ANON_KEY is empty in this build."); return out; }
  if (info.kind === "secret" || info.role === "service_role") out.push("This is a SECRET/service_role key. Replace it with the anon/publishable key and rotate the leaked one.");
  if (info.kind === "unknown") out.push("The key has an unexpected shape (extra spaces, quotes or a truncated paste?).");
  const urlRef = refFromUrl(url);
  if (info.ref && urlRef && info.ref !== urlRef) out.push(`The key belongs to project "${info.ref}" but the URL is project "${urlRef}".`);
  if (info.kind === "jwt" && info.role && info.role !== "anon" && info.role !== "service_role") out.push(`Unexpected key role "${info.role}".`);
  return out;
}

export const configProblems = (url: string | undefined, key: string | undefined): string[] =>
  keyProblems(url, describeKey(key));
