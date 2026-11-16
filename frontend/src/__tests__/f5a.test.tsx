import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Auth from '../auth/AuthContext';
import { formatSize } from '../lib/format';
import { AgendaPage } from '../pages/content/AgendaPage';
import { CommunicationsPage } from '../pages/content/CommunicationsPage';
import { DocumentsPage } from '../pages/content/DocumentsPage';
import { OpportunitiesPage } from '../pages/content/OpportunitiesPage';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const meta = (n: number) => ({ page: 1, limit: 10, total: n, totalPages: 1 });
const wrap = (ui: React.ReactNode) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>
);
afterEach(() => vi.restoreAllMocks());
beforeEach(() => { vi.spyOn(Auth, 'useAuth').mockReturnValue({ can: () => false } as unknown as ReturnType<typeof Auth.useAuth>); });

describe('formatSize', () => {
  it('écrit les tailles en français', () => {
    expect(formatSize(500)).toBe('500 octets');
    expect(formatSize(2048)).toBe('2 Ko');
    expect(formatSize(1_572_864)).toBe('1,5 Mo');
  });
});

describe('contenus en lecture', () => {
  it('liste les documents', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [{ id: '1', title: 'Guide test', description: 'Un guide', category: 'GUIDE', accessLevel: 'MEMBERS', isFeatured: true, publishedAt: '2026-01-05T00:00:00Z', file: { originalName: 'guide.pdf', mimeType: 'application/pdf', sizeBytes: 2048 } }], meta: meta(1) }));
    render(wrap(<DocumentsPage />));
    expect(await screen.findByText('Guide test')).toBeInTheDocument();
    expect(screen.getByText('À la une')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Télécharger « Guide test »/ })).toBeInTheDocument();
  });

  it('affiche un message clair quand il n’y a aucune opportunité', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [], meta: meta(0) }));
    render(wrap(<OpportunitiesPage />));
    expect(await screen.findByText(/Aucune opportunité ne correspond/)).toBeInTheDocument();
  });

  it('signale les communications non lues', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [{ id: '1', kind: 'INTERNAL', category: 'Information', title: 'Réunion annuelle', excerpt: 'Bonjour', senderLabel: 'Équipe CAPH-CI', publishedAt: '2026-10-01T09:00:00Z', isRead: false }], meta: meta(1) }));
    render(wrap(<CommunicationsPage />));
    expect(await screen.findByText('Non lue')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Réunion annuelle/ })).toHaveAttribute('href', '/espace/communications/1');
  });

  it('affiche l’agenda avec les dates en français', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [{ id: '1', type: 'MEETING', title: 'Assemblée', description: null, startsAt: '2026-12-10T09:00:00Z', endsAt: '2026-12-10T12:00:00Z', mode: 'ONSITE', location: 'Abidjan', status: 'PLANNED', region: null }], meta: meta(1) }));
    render(wrap(<AgendaPage />));
    expect(await screen.findByText('Assemblée')).toBeInTheDocument();
    expect(screen.getByText(/jeudi 10 décembre/i)).toBeInTheDocument();
    expect(screen.getByText('Sur place — Abidjan')).toBeInTheDocument();
  });
});
