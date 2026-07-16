import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { client, setAuthToken } from './apollo';
import {
  DEMO_DISPLAY_NAME,
  DEMO_SESSION_KEY,
  DEMO_USER_ID,
  DemoSession,
  createDemoToken,
} from './demo';

type AppUser = {
  id: string;
  displayName: string;
  email?: string;
};

interface AuthContextType {
  user: AppUser | null;
  session: Session | DemoSession | null;
  loading: boolean;
  /** True when either Supabase OTP or demo session can sign in */
  authEnabled: boolean;
  isDemo: boolean;
  signInAsDemo: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  authEnabled: true,
  isDemo: false,
  signInAsDemo: async () => {},
  signOut: async () => {},
});

function isDemoSession(s: Session | DemoSession | null): s is DemoSession {
  return !!s && 'userId' in s && 'token' in s;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | DemoSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DEMO_SESSION_KEY);
        if (raw) {
          const demo = JSON.parse(raw) as DemoSession;
          if (!cancelled) {
            setSession(demo);
            setUser({ id: demo.userId, displayName: demo.displayName });
            setAuthToken(demo.token);
            setLoading(false);
          }
          return;
        }

        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (!cancelled) {
            setSession(data.session);
            const u = data.session?.user;
            setUser(
              u
                ? { id: u.id, displayName: u.email ?? 'Neighbor', email: u.email }
                : null,
            );
            setAuthToken(data.session?.access_token ?? null);
            setLoading(false);
          }
          return;
        }
      } catch (e) {
        console.warn(e);
      }
      if (!cancelled) setLoading(false);
    })();

    if (!isSupabaseConfigured) {
      return () => {
        cancelled = true;
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(
        next?.user
          ? { id: next.user.id, displayName: next.user.email ?? 'Neighbor', email: next.user.email }
          : null,
      );
      setAuthToken(next?.access_token ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signInAsDemo = async () => {
    const demo: DemoSession = {
      userId: DEMO_USER_ID,
      displayName: DEMO_DISPLAY_NAME,
      token: createDemoToken(DEMO_USER_ID),
    };
    await AsyncStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demo));
    setAuthToken(demo.token);
    setSession(demo);
    setUser({ id: demo.userId, displayName: demo.displayName });
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(DEMO_SESSION_KEY);
    setAuthToken(null);
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    await client.resetStore();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        authEnabled: true,
        isDemo: isDemoSession(session),
        signInAsDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
