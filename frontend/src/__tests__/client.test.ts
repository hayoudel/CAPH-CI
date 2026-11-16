import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, setAccessToken } from '../api/client';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const session = { accessToken: 'nouveau', user: { id: '1' } };

describe('client API', () => {
  beforeEach(() => setAccessToken(null));
  afterEach(() => vi.restoreAllMocks());

  it('envoie le jeton en en-tête Authorization', async () => {
    setAccessToken('abc');
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, { ok: true }));
    await api('/ping');
    const headers = f.mock.calls[0][1]!.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer abc');
  });

  it('transforme une erreur API en ApiError avec le message français', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(422, { code: 'VALIDATION', message: 'Numéro invalide.' }));
    await expect(api('/x', { auth: false })).rejects.toMatchObject({ status: 422, message: 'Numéro invalide.' });
  });

  it('renvoie un message clair si le serveur est injoignable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fail'));
    const err = await api('/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toMatch(/Impossible de joindre le serveur/);
  });

  it('renouvelle la session sur 401 puis rejoue la requête', async () => {
    setAccessToken('expire');
    const f = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(401, { message: 'expiré' }))
      .mockResolvedValueOnce(json(200, session))
      .mockResolvedValueOnce(json(200, { data: 1 }));
    const res = await api<{ data: number }>('/donnees');
    expect(res.data).toBe(1);
    expect(f).toHaveBeenCalledTimes(3);
    expect(String(f.mock.calls[1][0])).toContain('/auth/refresh');
  });

  it('partage un seul renouvellement entre appels simultanés', async () => {
    setAccessToken('expire');
    let refreshCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/auth/refresh')) { refreshCalls++; return json(200, session); }
      return json(refreshCalls ? 200 : 401, { ok: true });
    });
    await Promise.all([api('/a'), api('/b')]);
    expect(refreshCalls).toBe(1);
  });

  it('message 429 par défaut en français', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 429 }));
    await expect(api('/x', { auth: false })).rejects.toThrow(/Trop de tentatives/);
  });
});
