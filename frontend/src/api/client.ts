import type { SessionResponse } from './types';

const BASE = `${(import.meta.env.VITE_API_URL as string | undefined) ?? ''}/api/v1`;

/** Erreur renvoyée par l'API : { statusCode, code, message, details? }. Le message est déjà rédigé en français. */
export interface FieldError { field: string; message: string }

export class ApiError extends Error {
  /** Erreurs rattachées à un champ du formulaire (ex. « organization.email »), quand l'API les fournit. */
  public fieldErrors: FieldError[];
  constructor(public status: number, public code: string, message: string, public details?: string[], fieldErrors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.fieldErrors = fieldErrors;
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
  const raw = Array.isArray(body.details) ? body.details : [];
  const fieldErrors = raw.filter((d): d is FieldError => typeof d === 'object' && d !== null && 'field' in d && 'message' in d);
  const details = raw.length ? raw.map((d) => (typeof d === 'object' && d !== null && 'message' in d ? String((d as FieldError).message) : String(d))) : undefined;
  return new ApiError(res.status, body.code ?? `HTTP_${res.status}`, body.message ?? fallback, details, fieldErrors);
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
  opts: { method?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined>; auth?: boolean; headers?: Record<string, string> } = {},
): Promise<T> {
  const qs = opts.query
    ? '?' + new URLSearchParams(Object.entries(opts.query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString()
    : '';
  const body = opts.body === undefined ? undefined : opts.body instanceof FormData ? opts.body : JSON.stringify(opts.body);
  const init = { method: opts.method ?? 'GET', body, auth: opts.auth, headers: opts.headers };
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

/** Télécharge un fichier protégé (il faut le jeton d'accès, donc on ne peut pas utiliser un simple lien) puis l'enregistre sur l'appareil. */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  let res = await request(path);
  if (res.status === 401) {
    try { await refreshSession(); res = await request(path); } catch { setAccessToken(null); listener?.(null); }
  }
  if (!res.ok) throw await toError(res);
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  let name = fallbackName;
  try { name = star ? decodeURIComponent(star[1]) : plain ? plain[1] : fallbackName; } catch { /* nom par défaut */ }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Récupère une image protégée et renvoie une adresse temporaire utilisable dans <img> (le jeton d'accès ne passe pas par une balise). */
export async function fetchBlobUrl(path: string): Promise<string> {
  let res = await request(path);
  if (res.status === 401) {
    try { await refreshSession(); res = await request(path); } catch { setAccessToken(null); listener?.(null); }
  }
  if (!res.ok) throw await toError(res);
  return URL.createObjectURL(await res.blob());
}
