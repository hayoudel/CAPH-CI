import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onSessionChange, refreshSession, setAccessToken } from '../api/client';
import type { SessionResponse, SessionUser } from '../api/types';

type Status = 'loading' | 'authenticated' | 'anonymous';
interface AuthValue {
  status: Status;
  user: SessionUser | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<SessionUser>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Page d'accueil de chaque profil : une organisation va vers son espace, le personnel CAPH-CI vers l'administration. */
export const homePathFor = (user: SessionUser) => (user.organizationId ? '/espace' : '/admin');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);

  const apply = useCallback((s: SessionResponse | null) => {
    setUser(s?.user ?? null);
    setStatus(s ? 'authenticated' : 'anonymous');
  }, []);

  useEffect(() => {
    onSessionChange(apply);
    // Au chargement : le cookie de session (invisible pour le script) permet de rouvrir la session sans ressaisir le mot de passe.
    refreshSession().catch(() => apply(null));
    return () => onSessionChange(null);
  }, [apply]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const s = await api<SessionResponse>('/auth/login', { method: 'POST', auth: false, body: { email, password, rememberMe } });
    setAccessToken(s.accessToken);
    apply(s);
    return s.user;
  }, [apply]);

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST', auth: false }); } catch { /* on déconnecte quand même côté navigateur */ }
    setAccessToken(null);
    apply(null);
  }, [apply]);

  const value = useMemo<AuthValue>(
    () => ({ status, user, login, logout, can: (p) => !!user?.permissions.includes(p) }),
    [status, user, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
