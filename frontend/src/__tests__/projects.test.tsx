import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Auth from '../auth/AuthContext';
import { ProjectsPage, validateProject, emptyProject } from '../pages/projects/ProjectsPage';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const project = (over: Record<string, unknown> = {}) => ({
  id: 'p1', reference: 'PRJ-2026-AAAAAA', organization: { id: 'o1', name: 'Association Test' }, title: 'Atelier numérique', description: 'Des ateliers pour les jeunes.',
  zone: 'Abidjan', startDate: '2026-12-01T00:00:00.000Z', endDate: null, hasCover: false, status: 'ONGOING', statusLabel: 'En cours', progress: null, results: null,
  isMine: false, canEdit: false, history: [], attachments: [], budgetXof: null, ...over,
});
const wrap = (ui: React.ReactNode) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>
);
const auth = (can: (p: string) => boolean) =>
  vi.spyOn(Auth, 'useAuth').mockReturnValue({ status: 'authenticated', can, user: null } as unknown as ReturnType<typeof Auth.useAuth>);
afterEach(() => vi.restoreAllMocks());

describe('validation du formulaire projet', () => {
  it('un brouillon n’exige que le nom', () => {
    expect(validateProject({ ...emptyProject, title: 'Atelier numérique' }, false)).toEqual({});
    expect(Object.keys(validateProject({ ...emptyProject, title: 'abc' }, false))).toEqual(['title']);
  });
  it('la soumission exige description, objectifs, zone et date de début', () => {
    expect(Object.keys(validateProject({ ...emptyProject, title: 'Atelier numérique' })).sort()).toEqual(['description', 'objectives', 'startDate', 'zone']);
  });
  it('refuse une fin avant le début et un budget non numérique', () => {
    const v = { ...emptyProject, title: 'Atelier numérique', startDate: '2026-12-01', endDate: '2026-01-01', budget: '12 abc' };
    const e = validateProject(v, false);
    expect(e.endDate).toBeTruthy();
    expect(e.budget).toBeTruthy();
  });
});

describe('page Projets', () => {
  it('affiche les cartes et cache « Proposer un projet » à qui n’en a pas le droit', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [project()], meta: { page: 1, limit: 12, total: 1, totalPages: 1 } }));
    auth(() => false);
    render(wrap(<ProjectsPage />));
    expect(await screen.findByRole('link', { name: 'Atelier numérique' })).toBeInTheDocument();
    expect(screen.getByText('Association Test')).toBeInTheDocument();
    expect(screen.queryByText(/Avancement/)).toBeNull(); // aucun pourcentage inventé
    expect(screen.queryByRole('link', { name: '+ Proposer un projet' })).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Filtrer les projets' })).getAllByRole('button')).toHaveLength(5);
  });
  it('montre le bouton au Président / Suppléant, et un filtre vide un message clair', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({ data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 1 } }));
    auth((p) => p === 'project.propose');
    render(wrap(<ProjectsPage />));
    expect(await screen.findByRole('link', { name: '+ Proposer un projet' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Projets terminés' }));
    expect(await screen.findByText('Aucun projet terminé pour le moment.')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('filter=COMPLETED');
  });
  it('affiche l’avancement seulement quand il existe', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [project({ progress: 40, results: '24 jeunes formés.' })], meta: { page: 1, limit: 12, total: 1, totalPages: 1 } }));
    auth(() => false);
    render(wrap(<ProjectsPage />));
    expect(await screen.findByText(/Avancement : 40 %/)).toBeInTheDocument();
    expect(screen.getByText(/24 jeunes formés/)).toBeInTheDocument();
  });
});
