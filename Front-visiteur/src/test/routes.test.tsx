import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './utils';
import { pageFromPathname, pagePath } from '../routes/paths';

const routes: [string, RegExp][] = [
  ['/', /Côte d.Ivoire inclusive/i],
  ['/la-caph-ci', /CAPH-CI/],
  ['/actions', /actions|domaines/i],
  ['/projets', /Projets/],
  ['/delegations', /Nos délégations/],
  ['/actualites', /Actualités/],
  ['/agenda', /Agenda/],
  ['/opportunites', /Opportunités/],
  ['/annuaire-oph', /Annuaire/i],
  ['/mediatheque', /Médiathèque/],
  ['/ressources', /Ressources/],
  ['/cabinet-conseil', /Cabinet/i],
  ['/transparence-impact', /Transparence/i],
  ['/adherer', /adhésion/i],
  ['/devenir-partenaire', /partenaire/i],
  ['/faire-un-don', /soutien|don/i],
  ['/contact', /Contact/],
  ['/espace-membres/connexion', /Espace membres/],
  ['/mentions-legales', /Mentions légales/],
];

describe('routes', () => {
  it.each(routes)('affiche %s', async (route, heading) => {
    renderApp(route);
    const matches = await screen.findAllByRole('heading', { name: heading }, { timeout: 4000 });
    expect(matches.length).toBeGreaterThan(0);
  });

  it('affiche la page 404 pour une route inconnue', async () => {
    renderApp('/page-inexistante');
    expect(await screen.findByText('Page introuvable')).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('retourne à l’accueil depuis la 404', async () => {
    renderApp('/page-inexistante');
    await userEvent.click(await screen.findByRole('button', { name: /Retour à l'accueil/i }));
    expect(await screen.findAllByRole('heading', { name: /Côte d.Ivoire inclusive/i })).not.toHaveLength(0);
  });

  it('convertit page ↔ URL de façon réversible', () => {
    expect(pagePath('project-detail', 'p1')).toBe('/projets/p1');
    expect(pageFromPathname('/projets/p1')).toEqual({ page: 'project-detail', id: 'p1' });
    expect(pagePath('donate', 'projet')).toBe('/faire-un-don?source=projet');
    expect(pageFromPathname('/inconnu').page).toBe('not-found');
  });
});
