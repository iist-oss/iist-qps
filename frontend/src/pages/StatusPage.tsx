import { useState } from "react";
import { supabase } from "../lib/supabase";
import { describeKey, keyProblems } from "../lib/diagnose";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function probe(label: string, path: string, init?: RequestInit): Promise<string> {
  if (!url || !key) return `${label}: skipped (URL or key missing)`;
  try {
    const res = await fetch(`${url}${path}`, {
      ...init,
      headers: { apikey: key, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = (await res.text()).replace(/\s+/g, " ").slice(0, 220);
    return `${label}: HTTP ${res.status}  ${body}`;
  } catch (e) {
    // "TypeError: Failed to fetch" = blocked / offline / DNS / CORS, not a Supabase answer
    return `${label}: NO ANSWER (${e instanceof Error ? e.message : String(e)})`;
  }
}

/** Connection check page at /#/status. Shows what the live build is really doing. Never prints the full key. */
export default function StatusPage() {
  const info = describeKey(key);
  const problems = keyProblems(url, info);
  const [lines, setLines] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true); setLines([]);
    const out: string[] = [];
    out.push(await probe("Auth health", "/auth/v1/health"));
    out.push(await probe("Auth settings", "/auth/v1/settings"));
    out.push(await probe("Stats (get_stats)", "/rest/v1/rpc/get_stats", { method: "POST", body: "{}" }));
    setLines(out); setBusy(false);
  }

  async function testSignIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    setLines((l) => [...l, error
      ? `Send code: FAILED  status=${(error as { status?: number }).status ?? "?"}  name=${error.name}  message=${error.message}`
      : "Send code: OK (an email should arrive)"]);
    setBusy(false);
  }

  return (
    <div className="page">
      <h1>Connection check</h1>
      <p className="subtitle">Send a screenshot of this page to the maintainer.</p>
      <pre className="status-box">{[
        `URL: ${url ?? "(empty)"}`,
        `Key: ${info.kind}, length ${info.length}, starts "${info.prefix}", role ${info.role ?? "-"}, project ${info.ref ?? "-"}`,
        problems.length ? "PROBLEMS:\n- " + problems.join("\n- ") : "Key and URL look consistent.",
      ].join("\n")}</pre>
      <div className="row"><button type="button" onClick={() => void run()} disabled={busy}>{busy ? "Checking…" : "Run checks"}</button></div>
      <div className="login-form">
        <label htmlFor="e">Test the sign-in request (sends a real code)</label>
        <input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@ug.iist.ac.in" />
        <button type="button" onClick={() => void testSignIn()} disabled={busy || email.trim() === ""}>Send test code</button>
      </div>
      {lines.length > 0 && <pre className="status-box">{lines.join("\n\n")}</pre>}
    </div>
  );
}
