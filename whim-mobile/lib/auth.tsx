import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useWhimStore } from '@/store/useWhimStore';

// App-wide auth state. Subscribes once to Supabase and exposes the session to
// every screen. The route guard (in app/_layout.tsx) reads `session`/`loading`
// to decide whether to show the app or the sign-in screen.
interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    // initial session (restored from AsyncStorage via supabase client)
    supabase.auth
      .getSession()
      .then(({ data }) => {
        userIdRef.current = data.session?.user?.id ?? null;
        setSession(data.session);
      })
      .catch(() => {}) // never block the app on a storage failure
      .finally(() => setLoading(false));

    // live updates: sign-in, sign-out, token refresh. When the user identity
    // changes (logout, or a different account signs in on this device), wipe the
    // in-memory app state so one account never sees another's saved spots.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      const nextId = next?.user?.id ?? null;
      if (userIdRef.current !== nextId) {
        userIdRef.current = nextId;
        useWhimStore.getState().reset();
      }
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return <AuthContext.Provider value={{ session, loading, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
