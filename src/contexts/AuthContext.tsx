import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  signInWithGoogle,
  getMe,
  logoutApi,
  persistSession,
  clearSession,
  hasPersistedSession,
  refreshTokens,
  type AuthUser,
  type AuthMembership,
  type AuthSubscription,
} from '@/lib/auth-api';
import { monitoring } from '@/lib/monitoring/monitoring';

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  memberships: AuthMembership[];
  subscription: AuthSubscription | null;
  currentAgencyId: string | null;
  /** Sign in via Google OAuth access token (obtained from Google button) */
  signIn: (googleAccessToken: string) => Promise<{ needsOnboarding: boolean; memberships: import('@/lib/auth-api').AuthMembership[] }>;
  signOut: () => Promise<void>;
  /** Re-fetches user/memberships/subscription from the server and updates context. */
  refreshSession: () => Promise<void>;
  /** Set active agency (for multi-agency owners) */
  selectAgency: (agencyId: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [memberships, setMemberships] = useState<AuthMembership[]>([]);
  const [subscription, setSubscription] = useState<AuthSubscription | null>(null);
  const [currentAgencyId, setCurrentAgencyId] = useState<string | null>(null);

  // On mount: try to restore session from stored refresh token
  useEffect(() => {
    if (!hasPersistedSession()) {
      setStatus('unauthenticated');
      return;
    }

    // Explicitly refresh first to get a fresh access token, then fetch user data
    refreshTokens()
      .then((ok) => {
        if (!ok) throw new Error('refresh failed');
        return getMe();
      })
      .then(({ user: u, memberships: m, subscription: s }) => {
        setUser(u);
        setMemberships(m);
        setSubscription(s);
        if (m.length === 1) setCurrentAgencyId(m[0].agencyId);
        const stored = localStorage.getItem('vyllad_current_agency');
        if (stored && m.some((mb) => mb.agencyId === stored)) {
          setCurrentAgencyId(stored);
        }
        monitoring.setUser({ id: u.id, email: u.email });
        setStatus('authenticated');
      })
      .catch(() => {
        clearSession();
        setStatus('unauthenticated');
      });
  }, []);

  const signIn = useCallback(async (googleAccessToken: string) => {
    const session = await signInWithGoogle(googleAccessToken);
    persistSession(session);
    setUser(session.user);
    setMemberships(session.memberships);
    setSubscription(session.subscription);

    if (session.memberships.length === 1) {
      setCurrentAgencyId(session.memberships[0].agencyId);
      localStorage.setItem('vyllad_current_agency', session.memberships[0].agencyId);
    }

    setStatus('authenticated');
    monitoring.setUser({ id: session.user.id, email: session.user.email });

    return {
      needsOnboarding: session.needsOnboarding,
      memberships: session.memberships,
    };
  }, []);

  const signOut = useCallback(async () => {
    await logoutApi();
    clearSession();
    localStorage.removeItem('vyllad_current_agency');
    setUser(null);
    setMemberships([]);
    setSubscription(null);
    setCurrentAgencyId(null);
    monitoring.setUser(null);
    setStatus('unauthenticated');
  }, []);

  const selectAgency = useCallback((agencyId: string) => {
    setCurrentAgencyId(agencyId);
    localStorage.setItem('vyllad_current_agency', agencyId);
  }, []);

  const refreshSession = useCallback(async () => {
    const { user: u, memberships: m, subscription: s } = await getMe();
    setUser(u);
    setMemberships(m);
    setSubscription(s);
    if (m.length === 1) setCurrentAgencyId(m[0].agencyId);
    const stored = localStorage.getItem('vyllad_current_agency');
    if (stored && m.some((mb) => mb.agencyId === stored)) setCurrentAgencyId(stored);
  }, []);

  return (
    <AuthContext.Provider
      value={{ status, user, memberships, subscription, currentAgencyId, signIn, signOut, refreshSession, selectAgency }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
