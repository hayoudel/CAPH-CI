import { describe, expect, it } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../mocks/server';
import { renderApp } from './utils';

const heading = (name: RegExp) => screen.findAllByRole('heading', { name }, { timeout: 4000 });

describe('header et navigation', () => {
  it('navigue via le menu principal et marque la page active', async () => {
    renderApp('/');
    await heading(/Côte d.Ivoire inclusive/i);
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    await userEvent.click(within(nav).getByRole('button', { name: /^Contact$/ }));
    expect((await heading(/^Contact$/)).length).toBeGreaterThan(0);
    expect(within(screen.getByRole('navigation', { name: 'Navigation principale' })).getByRole('button', { name: /^Contact$/ })).toHaveAttribute('aria-current', 'page');
  });

  it('ouvre et ferme le menu mobile', async () => {
    renderApp('/');
    await heading(/Côte d.Ivoire inclusive/i);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    expect(screen.getByRole('navigation', { name: 'Navigation mobile' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fermer le menu' }));
    expect(screen.queryByRole('navigation', { name: 'Navigation mobile' })).not.toBeInTheDocument();
  });

  it('propose un lien d’évitement et les outils d’accessibilité', async () => {
    renderApp('/');
    expect(await screen.findByText('Aller au contenu')).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('button', { name: 'Augmenter la taille du texte' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Augmenter la taille du texte' }));
    expect(document.documentElement).toHaveClass('text-lg');
  });
});

describe('projets', () => {
  it('filtre par mot-clé, vide l’état et ouvre le détail', async () => {
    renderApp('/projets');
    const search = await screen.findByLabelText('Mot-clé', undefined, { timeout: 4000 });
    await userEvent.type(search, 'EMPLOI+CI');
    const cards = await screen.findAllByText(/Voir le projet/);
    expect(cards.length).toBeGreaterThanOrEqual(1);

    await userEvent.clear(search);
    await userEvent.type(search, 'zzzz-aucun-resultat');
    expect(screen.queryByText(/Voir le projet/)).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, 'EMPLOI+CI');
    await userEvent.click((await screen.findAllByText(/Voir le projet/))[0]);
    expect((await heading(/EMPLOI\+CI/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Prototype — à valider/).length).toBeGreaterThan(0);
  });

  it('affiche le détail à l’URL /projets/:id', async () => {
    renderApp('/projets/p1');
    expect((await heading(/EMPLOI\+CI/)).length).toBeGreaterThan(0);
  });

  it('gère une erreur API avec possibilité de réessayer', async () => {
    server.use(http.get('/api/projects', () => HttpResponse.json({ message: 'Service indisponible' }, { status: 500 })));
    renderApp('/projets');
    expect(await screen.findByRole('alert', undefined, { timeout: 6000 })).toHaveTextContent(/Impossible de charger/);
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});

describe('médiathèque', () => {
  it('ouvre la visionneuse, navigue au clavier et ferme avec Échap', async () => {
    renderApp('/mediatheque');
    const first = (await screen.findAllByRole('button', { name: /Voir la photo/ }, { timeout: 4000 }))[0];
    await userEvent.click(first);
    const dialog = await screen.findByRole('dialog');
    const firstTitle = dialog.getAttribute('aria-label');
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getByRole('dialog').getAttribute('aria-label')).not.toBe(firstTitle));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('propose les onglets Photos et Vidéos', async () => {
    renderApp('/mediatheque');
    await screen.findAllByRole('button', { name: /Voir la photo/ }, { timeout: 4000 });
    const videosTab = screen.getByRole('tab', { name: /Vidéos/ });
    expect(screen.getByRole('tab', { name: /Photos/ })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(videosTab);
    expect(videosTab).toHaveAttribute('aria-selected', 'true');
    expect((await screen.findAllByRole('button', { name: /Voir la vidéo/ })).length).toBeGreaterThan(0);
  });
});

describe('formulaire de contact', () => {
  it('affiche des erreurs accessibles puis confirme l’envoi simulé', async () => {
    renderApp('/contact');
    await userEvent.click(await screen.findByRole('button', { name: 'Envoyer le message' }));
    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(/erreurs empêchent/);
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-describedby', expect.stringContaining('email-error'));

    await userEvent.type(screen.getByLabelText(/Nom & Prénom/), 'Awa Koné');
    await userEvent.type(screen.getByLabelText(/Email/), 'awa@example.ci');
    await userEvent.selectOptions(screen.getByLabelText(/Sujet/), 'Informations générales');
    await userEvent.type(screen.getByLabelText(/^Message/), 'Bonjour, ceci est un message de test.');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le message' }));
    expect(await screen.findByText('Message envoyé !')).toBeInTheDocument();
    expect(screen.getByText(/aucune donnée n’a été transmise/)).toBeInTheDocument();
  });

  it('affiche l’erreur API et empêche le double envoi', async () => {
    let calls = 0;
    server.use(http.post('/api/forms/contact', async () => { calls += 1; await delay(150); return HttpResponse.json({ message: 'Erreur serveur simulée' }, { status: 500 }); }));
    renderApp('/contact');
    await userEvent.type(await screen.findByLabelText(/Nom & Prénom/), 'Awa');
    await userEvent.type(screen.getByLabelText(/Email/), 'awa@example.ci');
    await userEvent.selectOptions(screen.getByLabelText(/Sujet/), 'Autre');
    await userEvent.type(screen.getByLabelText(/^Message/), 'Un message suffisamment long.');
    await userEvent.click(screen.getByRole('checkbox'));
    const button = screen.getByRole('button', { name: 'Envoyer le message' });
    await userEvent.dblClick(button);
    expect(await screen.findByText('Erreur serveur simulée')).toBeInTheDocument();
    expect(calls).toBe(1);
  });
});

describe('formulaire de partenariat', () => {
  it('valide les champs requis puis envoie', async () => {
    renderApp('/devenir-partenaire');
    await userEvent.click(await screen.findByRole('button', { name: /Envoyer ma proposition/ }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Organisation \*/), 'Entreprise Test');
    await userEvent.type(screen.getByLabelText(/Responsable/), 'Koffi Yao');
    await userEvent.type(screen.getByLabelText(/Fonction/), 'Directeur');
    await userEvent.type(screen.getByLabelText(/Téléphone/), '0700000000');
    await userEvent.type(screen.getByLabelText(/Email/), 'contact@test.ci');
    await userEvent.selectOptions(screen.getByLabelText(/Type d'organisation/), 'ONG');
    await userEvent.selectOptions(screen.getByLabelText(/Type de collaboration/), 'Mécénat');
    await userEvent.type(screen.getByLabelText(/^Message/), 'Nous souhaitons collaborer.');
    await userEvent.click(screen.getByRole('button', { name: /Envoyer ma proposition/ }));
    expect((await heading(/Demande reçue/)).length).toBeGreaterThan(0);
  });
});

describe('adhésion', () => {
  it('affiche les conditions puis le formulaire conditionnel et valide', async () => {
    renderApp('/adherer');
    await userEvent.click((await screen.findAllByRole('button', { name: /Faire une demande d'adhésion/ }))[0]);
    expect((await heading(/Formulaire de demande d'adhésion/)).length).toBeGreaterThan(0);

    await userEvent.selectOptions(screen.getByLabelText(/Vous présentez une demande en tant que/), 'morale');
    expect(screen.getByLabelText(/Nom de l'organisation/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Soumettre ma demande/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/erreurs/);
    expect(screen.getByLabelText(/Nom de l'organisation/)).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('don simulé', () => {
  it('parcourt le don en nature jusqu’à la simulation terminée sans paiement', async () => {
    renderApp('/faire-un-don');
    await userEvent.click(await screen.findByRole('button', { name: /Don en nature/ }));
    await userEvent.click(screen.getByRole('button', { name: /Continuer/ }));
    await userEvent.click(screen.getByRole('button', { name: /Terminer la simulation/ }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Nom & Prénom/), 'Marie Test');
    await userEvent.type(screen.getByLabelText(/Email/), 'marie@example.ci');
    await userEvent.type(screen.getByLabelText(/Téléphone/), '0500000000');
    await userEvent.type(screen.getByLabelText(/Bien, équipement/), '10 fauteuils roulants');
    await userEvent.click(screen.getByRole('button', { name: /Terminer la simulation/ }));
    expect((await heading(/Simulation terminée/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/ne réalise aucun paiement/)).toBeInTheDocument();
  });

  it('n’envoie aucune donnée bancaire à l’API', async () => {
    let payload: Record<string, unknown> = {};
    server.use(http.post('/api/forms/donation-interest', async ({ request }) => {
      payload = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ simulated: true, reference: 'X', receivedAt: '', message: '' }, { status: 201 });
    }));
    renderApp('/faire-un-don');
    await userEvent.click(await screen.findByRole('button', { name: /Don en nature/ }));
    await userEvent.click(screen.getByRole('button', { name: /Continuer/ }));
    await userEvent.type(screen.getByLabelText(/Nom & Prénom/), 'Marie Test');
    await userEvent.type(screen.getByLabelText(/Email/), 'marie@example.ci');
    await userEvent.type(screen.getByLabelText(/Téléphone/), '0500000000');
    await userEvent.type(screen.getByLabelText(/Bien, équipement/), 'Matériel');
    await userEvent.click(screen.getByRole('button', { name: /Terminer la simulation/ }));
    await screen.findAllByRole('heading', { name: /Simulation terminée/ });
    const keys = Object.keys(payload).join(',');
    expect(keys).not.toMatch(/card|numero|cvv|iban|expiry|bank/i);
  });
});

describe('espace membres', () => {
  it('redirige vers la connexion lorsque la route protégée est ouverte sans session', async () => {
    renderApp('/espace-membres/tableau-de-bord');
    expect((await heading(/Espace membres/)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
  });

  it('valide, se connecte (session prototype) et accède au tableau de bord', async () => {
    renderApp('/espace-membres/connexion');
    await userEvent.click(await screen.findByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Adresse email'), 'membre@example.ci');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect((await heading(/Tableau de bord/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Prototype — à valider/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    expect((await heading(/Espace membres/)).length).toBeGreaterThan(0);
  });
});
