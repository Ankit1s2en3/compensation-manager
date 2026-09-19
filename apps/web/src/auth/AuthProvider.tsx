import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import type { AuthenticatedUserResponse } from '@/api/types';
import { clearAuth, getStoredAuth, setAuth } from '@/auth/storage';

/**
 * Three states, not two. A token present in localStorage but not yet checked
 * this render cycle is neither "logged in" nor "logged out" — it's
 * `unverified`. There is no /api/auth/me to actually re-verify the token
 * against, so `unverified` collapses to `authenticated` or `unauthenticated`
 * synchronously in an effect — but it must still be a real, renderable state:
 * a lazy useState initializer would resolve this before the first render and
 * RequireAuth would never see `unverified`, so a hard refresh on a deep link
 * would either flash the login screen or (worse) redirect through it.
 */
type AuthStatus = 'unverified' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthenticatedUserResponse | null;
  login: (token: string, user: AuthenticatedUserResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('unverified');
  const [user, setUser] = useState<AuthenticatedUserResponse | null>(null);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored === null) {
      setStatus('unauthenticated');
      return;
    }
    setUser(stored.user);
    setStatus('authenticated');
  }, []);

  function login(token: string, nextUser: AuthenticatedUserResponse) {
    setAuth({ token, user: nextUser });
    setUser(nextUser);
    setStatus('authenticated');
  }

  function logout() {
    clearAuth();
    setUser(null);
    setStatus('unauthenticated');
  }

  return (
    <AuthContext.Provider value={{ status, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
