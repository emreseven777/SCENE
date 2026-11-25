import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { LEGAL_VERSION } from "./legal-documents";
import { supabase } from "./supabase";

interface AuthCtx {
  session: Session | null;
  userId: string | null;
  email: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, birthDate: string, termsAccepted: boolean) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => { setSession(s); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    session,
    userId: session?.user.id ?? null,
    email: session?.user.email ?? null,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
    signUp: async (email, password, name, birthDate, termsAccepted) => {
      const { data, error } = await supabase!.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim(), scene_registration: { birth_date: birthDate, terms_accepted: termsAccepted, version: LEGAL_VERSION } },
          emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).href,
        },
      });
      if (error) throw error;
      // Supabase hides "already registered" when confirmation is on: the user comes back with no identities.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error("User already registered");
      }
      return { needsConfirmation: !data.session };
    },
    signOut: async () => {
      if (session?.user.id && "serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
            await supabase!.from("scene_push_subscriptions").delete().eq("user_id", session.user.id).eq("endpoint", subscription.endpoint);
          }
        } catch { /* Unsupported browsers can still sign out. */ }
      }
      const { error } = await supabase!.auth.signOut();
      if (error) throw error;
    },
  }), [session, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("AuthProvider missing");
  return c;
}
