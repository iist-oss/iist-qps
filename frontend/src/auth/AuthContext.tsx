import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { university } from "../config/university";

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean; // UI hint only; real enforcement is RLS + Edge Functions
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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

  // Separate effect: calling supabase inside onAuthStateChange can deadlock.
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
    signIn: async () => {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          // Google allows only one `hd` value, so with several domains use "*" (= any Workspace account)
          queryParams: university.allowedEmailDomains.length > 0 ? { hd: "*" } : undefined,
        },
      });
    },
    signOut: async () => { await supabase.auth.signOut(); },
  }), [session, isAdmin, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
