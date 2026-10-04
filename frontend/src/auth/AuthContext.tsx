import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { university } from "../config/university";
import { friendlyAuthError, looksLikeEmail, normalizeEmail } from "../lib/email";

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: () => void;
  sendCode: (email: string) => Promise<string | null>;
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) { setIsAdmin(false); return; }
    let cancelled = false;
    supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setIsAdmin(Boolean(data)); });
    return () => { cancelled = true; };
  }, [userId]);

  const value = useMemo<AuthState>(() => ({
    user: session?.user ?? null,
    session,
    isAdmin,
    loading,
    signIn: () => navigate("/login"),
    sendCode: async (raw) => {
      const email = normalizeEmail(raw);
      if (!looksLikeEmail(email)) return "Enter a valid email address.";
      const { data: allowed, error: rpcErr } = await supabase.rpc("email_domain_ok", { p_email: email });
      if (!rpcErr && allowed === false) {
        const list = university.allowedEmailDomains.map((d) => "@" + d).join(" or ");
        return `Only ${list} email addresses can sign in.`;
      }
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) console.error(error.message);
      return error ? friendlyAuthError(error.message) : null;
    },
    verifyCode: async (raw, code) => {
      const { error } = await supabase.auth.verifyOtp({
        email: normalizeEmail(raw), token: code.replace(/\s+/g, ""), type: "email",
      });
      if (error) console.error(error.message);
      return error ? friendlyAuthError(error.message) : null;
    },
    signOut: async () => { await supabase.auth.signOut(); },
  }), [session, isAdmin, loading, navigate]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
