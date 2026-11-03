import type { SessionResponse } from './types';

const BASE = `${(import.meta.env.VITE_API_URL as string | undefined) ?? ''}/api/v1`;

/** Erreur renvoyée par l'API : { statusCode, code, message, details? }. Le message est déjà rédigé en français. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: string[]) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Le jeton d'accès reste en mémoire uniquement (jamais dans localStorage) : il disparaît à la fermeture de l'onglet. */
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };

type SessionListener = (s: SessionResponse | null) => void;
let listener: SessionListener | null = null;
export const onSessionChange = (fn: SessionListener | null) => { listener = fn; };

async function request(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (init.auth !== false && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  try {
    return await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.');
  }
}

async function toError(res: Response): Promise<ApiError> {
  let body: { code?: string; message?: string; details?: unknown } = {};
  try { body = await res.json(); } catch { /* corps vide */ }
  const fallback =
    res.status === 429 ? 'Trop de tentatives. Patientez quelques minutes avant de réessayer.'
    : res.status >= 500 ? 'Une erreur est survenue de notre côté. Réessayez dans un instant.'
    : 'La requête n’a pas pu aboutir.';
  const details = Array.isArray(body.details) ? body.details.map(String) : undefined;
  return new ApiError(res.status, body.code ?? `HTTP_${res.status}`, body.message ?? fallback, details);
}

/** Un seul renouvellement de session à la fois : les appels simultanés partagent la même requête (le jeton est à usage unique). */
let refreshing: Promise<SessionResponse> | null = null;
export function refreshSession(): Promise<SessionResponse> {
  refreshing ??= (async () => {
    try {
      const res = await request('/auth/refresh', { method: 'POST', auth: false });
      if (!res.ok) throw await toError(res);
      const session = (await res.json()) as SessionResponse;
      setAccessToken(session.accessToken);
      listener?.(session);
      return session;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T = void>(
  path: string,
  opts: { method?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined>; auth?: boolean } = {},
): Promise<T> {
  const qs = opts.query
    ? '?' + new URLSearchParams(Object.entries(opts.query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString()
    : '';
  const init = { method: opts.method ?? 'GET', body: opts.body === undefined ? undefined : JSON.stringify(opts.body), auth: opts.auth };
  let res = await request(path + (qs === '?' ? '' : qs), init);

  if (res.status === 401 && opts.auth !== false) {
    try {
      await refreshSession();
      res = await request(path + (qs === '?' ? '' : qs), init);
    } catch {
      setAccessToken(null);
      listener?.(null);
    }
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
