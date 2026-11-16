import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Auth from '../auth/AuthContext';
import { DirectoryPage } from '../pages/DirectoryPage';
import { validate } from '../pages/org/OrganizationPage';
import { TeamPage } from '../pages/org/TeamPage';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const wrap = (ui: React.ReactNode) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>
);
const base = { acronym: '', commune: '', address: '', postalAddress: '', regionId: '', phone: '', email: '', website: '', interventionZone: '', domainIds: [], disabilityTypeIds: [] };

afterEach(() => vi.restoreAllMocks());

describe('profil organisation : validation', () => {
  it('accepte un formulaire vide', () => expect(validate(base)).toEqual({}));
  it('refuse téléphone, e-mail et site invalides', () => {
    const e = validate({ ...base, phone: 'abc', email: 'x', website: 'www.site.ci' });
    expect(Object.keys(e).sort()).toEqual(['email', 'phone', 'website']);
  });
  it('accepte des valeurs correctes', () => {
    expect(validate({ ...base, phone: '+225 07 00 00 00 00', email: 'a@b.ci', website: 'https://site.ci' })).toEqual({});
  });
});

describe('annuaire public', () => {
  it('affiche les organisations trouvées', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).includes('/filters')
        ? json({ regions: [], domains: [], disabilityTypes: [] })
        : json({ data: [{ id: '1', name: 'Association Test', acronym: 'AT', region: { id: 'r', name: 'Lagunes' }, commune: 'Cocody', interventionZone: null, domains: [], disabilityTypes: [], contact: {} }], meta: { page: 1, limit: 12, total: 1, totalPages: 1 } }));
    render(wrap(<DirectoryPage />));
    expect(await screen.findByText('Association Test')).toBeInTheDocument();
    expect(screen.getByText('organisation trouvée')).toBeInTheDocument();
  });
  it('dit clairement quand il n’y a aucun résultat', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).includes('/filters') ? json({ regions: [], domains: [], disabilityTypes: [] })
        : json({ data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 1 } }));
    render(wrap(<DirectoryPage />));
    expect(await screen.findByText(/n’est encore publiée/)).toBeInTheDocument();
  });
});

describe('équipe', () => {
  const as = (permissions: string[], role = 'OPH_PRESIDENT') => vi.spyOn(Auth, 'useAuth').mockReturnValue({
    status: 'authenticated', user: { organizationId: 'o1', permissions, organizationRole: { code: role, label: role } } as never, login: vi.fn(), logout: vi.fn(), can: (p: string) => permissions.includes(p),
  } as never);
  const members = [
    { userId: 'u1', firstName: 'Awa', lastName: 'Koné', jobTitle: null, role: { code: 'OPH_PRESIDENT', label: 'Président' }, status: 'ACTIVE' },
    { userId: 'u2', firstName: 'Fatou', lastName: 'Diallo', jobTitle: null, role: { code: 'OPH_VIEWER', label: 'Consultation' }, status: 'ACTIVE' },
  ];

  it('le Président peut inviter et retirer', async () => {
    as(['organization.members.manage']);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(members));
    render(wrap(<TeamPage />));
    expect(await screen.findByText('Fatou Diallo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retirer Fatou Diallo/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inviter un membre' })).toBeInTheDocument();
    expect(screen.queryByText('Inviter une personne')).toBeNull(); // le formulaire n’est plus au bas de la page
  });
  it('un simple membre ne voit aucune action', async () => {
    as([]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(members));
    render(wrap(<TeamPage />));
    expect(await screen.findByText('Fatou Diallo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retirer/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Inviter un membre' })).toBeNull();
  });
  it('le Suppléant gère l’équipe mais ne peut pas toucher à un autre Suppléant', async () => {
    as(['organization.members.manage'], 'OPH_DEPUTY');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([
      ...members,
      { userId: 'u3', firstName: 'Issa', lastName: 'Traoré', jobTitle: null, role: { code: 'OPH_DEPUTY', label: 'Suppléant' }, status: 'ACTIVE' },
    ]));
    render(wrap(<TeamPage />));
    expect(await screen.findByRole('button', { name: /Retirer Fatou Diallo/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retirer Issa Traoré/ })).toBeNull();
  });
  it('demande confirmation avant de retirer', async () => {
    as(['organization.members.manage']);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(members));
    render(wrap(<TeamPage />));
    await userEvent.click(await screen.findByRole('button', { name: /Retirer Fatou Diallo/ }));
    expect(screen.getByText(/Son compte sera désactivé/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Non, la garder' }));
    expect(screen.queryByText(/Son compte sera désactivé/)).toBeNull();
  });
  it('signale les champs manquants à l’invitation', async () => {
    as(['organization.members.manage']);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(members));
    render(wrap(<TeamPage />));
    await userEvent.click(await screen.findByRole('button', { name: 'Inviter un membre' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Envoyer l’invitation' }));
    expect(screen.getByText('Saisissez le prénom.')).toBeInTheDocument();
    expect(screen.getByText('Saisissez le nom.')).toBeInTheDocument();
  });
});
