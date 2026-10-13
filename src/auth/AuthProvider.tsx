import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isAdminEmail, openedFromRecoveryLink, supabase } from '../lib/supabase';

interface AuthState {
  ready: boolean;
  session: Session | null;
  isAdmin: boolean;
  /** True while the user arrived from a password-reset email and must choose a new password. */
  recovering: boolean;
  finishRecovery: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [recovering, setRecovering] = useState(openedFromRecoveryLink);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(s);
    });
    supabase.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      // Supabase has read the tokens from the address bar; give the hash back to the router.
      const h = window.location.hash;
      if (h.includes('access_token') || h.includes('error')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/');
      }
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    ready,
    session,
    isAdmin: isAdminEmail(session?.user.email),
    recovering: recovering && session !== null,
    finishRecovery: () => setRecovering(false),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
