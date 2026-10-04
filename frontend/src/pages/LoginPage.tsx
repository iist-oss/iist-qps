import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import { university } from "../config/university";
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function LoginPage() {
  const { user, sendCode, verifyCode } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { if (user) navigate("/", { replace: true }); }, [user, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true); setError(null);
    const err = await sendCode(email);
    setBusy(false);
    if (err) { setError(err); return; }
    setStep("code"); setCode(""); setCooldown(RESEND_SECONDS);
    toast.success("Code sent. Check your inbox (and spam).");
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const err = await verifyCode(email, code);
    setBusy(false);
    if (err) setError(err);
    else toast.success("Signed in");
  }

  const domains = university.allowedEmailDomains.map((d) => "@" + d).join(" or ");

  return (
    <div className="page">
      <h1>Sign in</h1>
      <p className="subtitle">Use your university email ({domains}). We will email you a one-time code.</p>

      {step === "email" ? (
        <form className="login-form" onSubmit={requestCode}>
          <label htmlFor="email">University email</label>
          <input id="email" type="email" inputMode="email" autoComplete="email" autoFocus required
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`name${university.allowedEmailDomains[0] ? "@" + university.allowedEmailDomains[0] : "@example.edu"}`} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy || email.trim() === ""}>{busy ? "Sending…" : "Send code"}</button>
        </form>
      ) : (
        <form className="login-form" onSubmit={submitCode}>
          <p className="muted">Code sent to <b>{email.trim().toLowerCase()}</b></p>
          <label htmlFor="code">{OTP_LENGTH}-digit code</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" autoFocus required maxLength={OTP_LENGTH + 2}
            value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy || code.trim() === ""}>{busy ? "Checking…" : "Sign in"}</button>
          <div className="row">
            <button type="button" disabled={busy || cooldown > 0} onClick={() => void requestCode()}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
            <button type="button" disabled={busy} onClick={() => { setStep("email"); setError(null); }}>Change email</button>
          </div>
        </form>
      )}
    </div>
  );
}
