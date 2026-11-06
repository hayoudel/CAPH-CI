/**
 * Couche API centralisée.
 * Toutes les requêtes passent par `apiFetch` : URL de base configurable
 * (VITE_API_BASE_URL), gestion homogène des erreurs, JSON uniquement.
 */
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type FetchOptions = Omit<RequestInit, 'body'> & { body?: unknown; params?: Record<string, string | number | undefined> };

export async function apiFetch<T>(path: string, { body, params, headers, ...init }: FetchOptions = {}): Promise<T> {
  const base = API_BASE_URL.startsWith('http') ? API_BASE_URL : `${window.location.origin}${API_BASE_URL}`;
  const url = new URL(`${base}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.', 0);
  }

  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'Une erreur est survenue. Veuillez réessayer.';
    throw new ApiError(message, response.status, payload);
  }
  return payload as T;
}

export const apiGet = <T>(path: string, params?: FetchOptions['params']) => apiFetch<T>(path, { method: 'GET', params });
export const apiPost = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body });
