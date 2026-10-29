import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api';
import type { AuthSession } from '../types';
import type { LoginValues } from '../schemas/forms';

type AuthState = {
  session: AuthSession | null;
  login: (values: LoginValues) => Promise<AuthSession>;
  logout: () => Promise<void>;
  isLoggingIn: boolean;
};

const AuthContext = createContext<AuthState | null>(null);
const STORAGE_KEY = 'caph-ci:prototype-session';

function readStored(): AuthSession | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

/** Session de prototype uniquement : aucun identifiant ni mot de passe n'est conservé. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readStored);
  const loginMutation = useMutation({ mutationFn: api.login });
  const logoutMutation = useMutation({ mutationFn: api.logout });

  const login = useCallback(async (values: LoginValues) => {
    const result = await loginMutation.mutateAsync(values);
    setSession(result);
    try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result)); } catch { /* stockage indisponible */ }
    return result;
  }, [loginMutation]);

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync().catch(() => undefined);
    setSession(null);
    try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* stockage indisponible */ }
  }, [logoutMutation]);

  const value = useMemo(
    () => ({ session, login, logout, isLoggingIn: loginMutation.isPending }),
    [session, login, logout, loginMutation.isPending],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return ctx;
}
