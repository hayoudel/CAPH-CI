import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Auth from '../auth/AuthContext';
import { validateNews } from '../pages/content/NewsPage';
import { emptyReport, ReportsPage, validateReport } from '../pages/content/ReportsPage';
import { checkFile } from '../ui/Attachments';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const wrap = (ui: React.ReactNode) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>
);
afterEach(() => vi.restoreAllMocks());

const okReport = { ...emptyReport, type: 'ACTIVITY', title: 'Rapport 2026', summary: 'Un résumé suffisamment long.', certify: true };

describe('rapport : validation', () => {
  it('refuse un formulaire vide', () => {
    expect(Object.keys(validateReport(emptyReport, true)).sort()).toEqual(['certify', 'summary', 'title', 'type']);
  });
  it('accepte un rapport correct', () => expect(validateReport(okReport, true)).toEqual({}));
  it('refuse un résumé de plus de 600 caractères', () => {
    expect(validateReport({ ...okReport, summary: 'x'.repeat(601) }, true).summary).toMatch(/600/);
    expect(validateReport({ ...okReport, summary: 'x'.repeat(600) }, true)).toEqual({});
  });
  it('exige la certification seulement à la création', () => {
    expect(validateReport({ ...okReport, certify: false }, true).certify).toBeTruthy();
    expect(validateReport({ ...okReport, certify: false }, false)).toEqual({});
  });
  it('refuse une période inversée', () => {
    expect(validateReport({ ...okReport, periodStart: '2026-06-30', periodEnd: '2026-01-01' }, true).periodEnd).toBeTruthy();
  });
});

describe('actualité : validation', () => {
  it('exige un titre et un texte assez longs', () => {
    expect(Object.keys(validateNews({ categoryId: '', title: 'abc', description: 'court' })).sort()).toEqual(['description', 'title']);
    expect(validateNews({ categoryId: '', title: 'Journée portes ouvertes', description: 'Nous avons organisé une journée portes ouvertes.' })).toEqual({});
  });
});

describe('pièces jointes : contrôle du fichier', () => {
  it('accepte PDF, JPG et PNG', () => {
    expect(checkFile({ name: 'a.pdf', type: 'application/pdf', size: 1000 })).toBeNull();
    expect(checkFile({ name: 'a.PNG', type: 'image/png', size: 1000 })).toBeNull();
  });
  it('refuse un type inconnu ou un fichier trop gros', () => {
    expect(checkFile({ name: 'a.exe', type: 'application/x-msdownload', size: 10 })).toMatch(/pas accepté/);
    expect(checkFile({ name: 'a.pdf', type: 'application/pdf', size: 11 * 1024 * 1024 })).toMatch(/10 Mo/);
  });
});

describe('liste des rapports', () => {
  it('propose de transmettre un rapport et signale une correction demandée', async () => {
    vi.spyOn(Auth, 'useAuth').mockReturnValue({ can: () => true } as unknown as ReturnType<typeof Auth.useAuth>);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({
      data: [{ id: '1', organization: { id: 'o', name: 'Org' }, type: 'ACTIVITY', title: 'Rapport T1', summary: 'x', periodStart: null, periodEnd: null, status: 'CORRECTION_REQUESTED', statusLabel: 'Correction demandée', reviewerNote: 'Précisez', submittedAt: '2026-03-01T00:00:00Z', processedAt: null, author: 'Awa Koné', canEdit: true, attachments: [] }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    }));
    render(wrap(<ReportsPage />));
    expect(await screen.findByText('Rapport T1')).toBeInTheDocument();
    expect(screen.getByText(/vous demande de corriger/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Transmettre un rapport' })).toHaveAttribute('href', '/espace/rapports/nouveau');
  });
});
