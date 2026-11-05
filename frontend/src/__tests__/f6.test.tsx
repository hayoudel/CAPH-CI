import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Auth from '../auth/AuthContext';
import { AppShell } from '../layouts/AppShell';
import { AgendaPage } from '../pages/content/AgendaPage';
import { DocumentsPage } from '../pages/content/DocumentsPage';
import { OpportunitiesPage } from '../pages/content/OpportunitiesPage';
import { HomePage } from '../pages/HomePage';
import { ReviewActions } from '../ui/Review';
import { TeamPage } from '../pages/org/TeamPage';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const list = { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } };
const wrap = (ui: React.ReactNode, path = '/') => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
  </QueryClientProvider>
);
const auth = (over: Record<string, unknown> = {}) =>
  vi.spyOn(Auth, 'useAuth').mockReturnValue({ status: 'authenticated', can: () => false, user: null, ...over } as unknown as ReturnType<typeof Auth.useAuth>);
afterEach(() => vi.restoreAllMocks());

describe('boutons d’ajout selon les permissions', () => {
  it.each([
    ['Documents', <DocumentsPage key="d" />, 'document.manage', '+ Ajouter un document'],
    ['Opportunités', <OpportunitiesPage key="o" />, 'opportunity.manage', '+ Ajouter une opportunité'],
    ['Agenda', <AgendaPage key="a" />, 'event.manage', '+ Ajouter un événement'],
  ])('%s : bouton caché pour un membre, visible pour le personnel autorisé', async (_n, page, perm, label) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(list));
    auth();
    const first = render(wrap(page));
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: label })).toBeNull();
    first.unmount();
    auth({ can: (p: string) => p === perm });
    render(wrap(page));
    expect(await screen.findByRole('button', { name: label })).toBeInTheDocument();
  });

  it('ouvre la fenêtre, refuse un formulaire vide, puis la ferme avec Échap', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(list));
    auth({ can: (p: string) => p === 'event.manage' });
    render(wrap(<AgendaPage />));
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: '+ Ajouter un événement' }));
    const dialog = screen.getByRole('dialog', { name: 'Ajouter un événement' });
    expect(dialog).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Ajouter à l’agenda' }));
    expect(await screen.findByText('Saisissez un titre d’au moins 3 caractères.')).toBeInTheDocument();
    expect(screen.getByText('Indiquez la date et l’heure de début.')).toBeInTheDocument();
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('envoie l’opportunité au serveur et affiche la confirmation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_u, init) =>
      init?.method === 'POST' ? json({ id: 'x' }, 201) : json(list));
    auth({ can: (p: string) => p === 'opportunity.manage' });
    render(wrap(<OpportunitiesPage />));
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: '+ Ajouter une opportunité' }));
    const dlg = within(screen.getByRole('dialog'));
    await u.type(dlg.getByLabelText(/Titre/), 'Appel à projets test');
    await u.type(dlg.getByLabelText(/Résumé/), 'Un résumé assez long pour passer.');
    await u.click(screen.getByRole('button', { name: 'Publier l’opportunité' }));
    expect(await screen.findByText('Opportunité publiée')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')!;
    expect(String(post[0])).toContain('/opportunities');
    expect(JSON.parse(String(post[1]!.body))).toMatchObject({ type: 'CALL_FOR_PROJECTS', title: 'Appel à projets test' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('refuse un document sans fichier', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(list));
    auth({ can: (p: string) => p === 'document.manage' });
    render(wrap(<DocumentsPage />));
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: '+ Ajouter un document' }));
    await u.type(within(screen.getByRole('dialog')).getByLabelText(/Titre/), 'Guide');
    await u.click(screen.getByRole('button', { name: 'Publier le document' }));
    expect(await screen.findByText('Choisissez le fichier à publier.')).toBeInTheDocument();
  });
});

describe('page d’accueil selon la connexion', () => {
  it('visiteur : « Se connecter » et « Adhérer »', () => {
    auth({ status: 'anonymous' });
    render(wrap(<HomePage />));
    expect(screen.getAllByRole('link', { name: 'Se connecter' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Adhérer à la CAPH-CI' })).toBeInTheDocument();
  });
  it('connecté : plus de connexion ni d’adhésion, un accès à son espace', () => {
    auth({ user: { firstName: 'Awa', organizationId: 'o1' }, can: () => true });
    render(wrap(<HomePage />));
    expect(screen.queryByRole('link', { name: 'Se connecter' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Adhérer|Voir comment adhérer|Suivre mon dossier/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Aller à mon espace' })).toHaveAttribute('href', '/espace');
    expect(screen.getByText(/Bonjour Awa/)).toBeInTheDocument();
  });
});

describe('bulle de notification du menu', () => {
  const shell = (unread: number) => {
    auth({ user: { firstName: 'Awa', lastName: 'K', organizationName: 'Org', organizationId: 'o1', permissions: [] }, can: () => true });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ unread }));
    return render(wrap(<AppShell area="member" />, '/espace'));
  };
  it('affiche le nombre dans une bulle', async () => {
    shell(3);
    const link = await screen.findByRole('link', { name: /Communications/ });
    await waitFor(() => expect(link.querySelector('.nav__badge')?.textContent).toBe('3'));
    expect(link).toHaveTextContent('3 non lues');
  });
  it('n’affiche aucune bulle quand tout est lu', async () => {
    shell(0);
    const link = await screen.findByRole('link', { name: /Communications/ });
    await new Promise((r) => setTimeout(r, 50));
    expect(link.querySelector('.nav__badge')).toBeNull();
  });
});

describe('Inviter un membre', () => {
  it('le bouton amène au formulaire d’invitation et y place le curseur', async () => {
    auth({ user: { organizationId: 'o1', organizationRole: { code: 'OPH_PRESIDENT' } }, can: (p: string) => p === 'organization.members.manage' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([]));
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(wrap(<TeamPage />));
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: 'Inviter un membre' }));
    expect(scroll).toHaveBeenCalled();
    expect(screen.getByLabelText(/Prénom/)).toHaveFocus();
  });
  it('le bouton est absent sans la permission', async () => {
    auth({ user: { organizationId: 'o1', organizationRole: { code: 'OPH_VIEWER' } }, can: () => false });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([]));
    render(wrap(<TeamPage />));
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: 'Inviter un membre' })).toBeNull();
  });
});

describe('contenus proposés par une OPH', () => {
  const onNotice = vi.fn();
  const item = { id: 'e1', title: 'Atelier', reviewStatus: 'PENDING' as const, reviewNote: null, organization: { id: 'o', name: 'Horizon Inclusif' } };

  it('le Président (droit « proposer ») ajoute un document sans validation : pas de réglages du personnel', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(list));
    auth({ can: (p: string) => p === 'document.propose' });
    render(wrap(<DocumentsPage />));
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: '+ Ajouter un document' }));
    const dlg = within(screen.getByRole('dialog'));
    expect(dlg.queryByText(/après validation/)).toBeNull(); // document interne : publié tout de suite
    expect(dlg.queryByLabelText(/Qui peut le consulter/)).toBeNull();
    expect(dlg.getByRole('button', { name: 'Publier le document' })).toBeInTheDocument();
  });

  it('une opportunité proposée par le Président avertit de la validation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(list));
    auth({ can: (p: string) => p === 'opportunity.propose' });
    render(wrap(<OpportunitiesPage />));
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: '+ Ajouter une opportunité' }));
    const dlg = within(screen.getByRole('dialog'));
    expect(dlg.getByText(/après validation par la CAPH-CI/)).toBeInTheDocument();
    expect(dlg.getByRole('button', { name: 'Envoyer pour validation' })).toBeInTheDocument();
  });

  it('une proposition apparaît « en attente » dans la liste, avec le nom de l’organisation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [{ id: 'e1', type: 'MEETING', title: 'Atelier', description: null, startsAt: '2027-03-01T09:00:00Z', endsAt: null, mode: 'ONSITE', location: null, status: 'PLANNED', region: null, reviewStatus: 'PENDING', reviewNote: null, organization: { id: 'o', name: 'Horizon Inclusif' } }], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } }));
    auth({ can: (p: string) => p === 'event.propose' });
    render(wrap(<AgendaPage />));
    expect(await screen.findByText('En attente de validation')).toBeInTheDocument();
    expect(screen.getByText('Proposé par Horizon Inclusif')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Valider/ })).toBeNull(); // pas de boutons de validation pour une OPH
  });

  it('le personnel valide en un clic', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ok: true }));
    render(wrap(<ReviewActions item={item} path="/events" canReview onNotice={onNotice} />));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Valider « Atelier »' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain('/events/e1/approve');
    await waitFor(() => expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ title: 'Contenu validé' })));
  });

  it('le refus exige un motif', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ok: true }));
    render(wrap(<ReviewActions item={item} path="/events" canReview onNotice={onNotice} />));
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: 'Refuser « Atelier »' }));
    await u.click(screen.getByRole('button', { name: 'Confirmer le refus' }));
    expect(await screen.findByText(/Expliquez le refus/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    await u.type(screen.getByLabelText(/Motif du refus/), 'Date impossible');
    await u.click(screen.getByRole('button', { name: 'Confirmer le refus' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain('/events/e1/reject');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]!.body))).toEqual({ note: 'Date impossible' });
  });

  it('aucun bouton de validation sans le droit de gestion', () => {
    render(wrap(<ReviewActions item={item} path="/events" canReview={false} onNotice={onNotice} />));
    expect(screen.queryByRole('button')).toBeNull();
  });
});
