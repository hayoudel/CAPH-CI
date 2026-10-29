/**
 * Table de correspondance entre les anciens noms de page (NavigationContext)
 * et les URL réelles gérées par React Router.
 * Source unique de vérité pour les routes de l'application.
 */
export type PageName =
  | 'home' | 'about' | 'mission' | 'gouvernance'
  | 'actions' | 'action-detail'
  | 'projects' | 'project-detail'
  | 'transparency'
  | 'delegations' | 'delegation-detail'
  | 'news' | 'news-detail'
  | 'agenda' | 'agenda-detail'
  | 'opportunities' | 'opportunity-detail'
  | 'oph' | 'oph-detail'
  | 'resources' | 'resource-detail'
  | 'media'
  | 'cabinet' | 'devis'
  | 'partner' | 'partner-confirm'
  | 'donate' | 'donate-confirm'
  | 'adhesion' | 'adhesion-form' | 'adhesion-confirm'
  | 'contact'
  | 'members' | 'members-dashboard'
  | 'legal' | 'privacy' | 'accessibility'
  | 'search' | 'not-found';

/** Pattern React Router de chaque page. */
export const pagePatterns: Record<Exclude<PageName, 'search' | 'not-found'>, string> = {
  home: '/',
  about: '/la-caph-ci',
  mission: '/la-caph-ci/mission',
  gouvernance: '/la-caph-ci/gouvernance',
  actions: '/actions',
  'action-detail': '/actions/:domainId',
  projects: '/projets',
  'project-detail': '/projets/:projectId',
  transparency: '/transparence-impact',
  delegations: '/delegations',
  'delegation-detail': '/delegations/:delegationId',
  news: '/actualites',
  'news-detail': '/actualites/:articleId',
  agenda: '/agenda',
  'agenda-detail': '/agenda/:eventId',
  opportunities: '/opportunites',
  'opportunity-detail': '/opportunites/:opportunityId',
  oph: '/annuaire-oph',
  'oph-detail': '/annuaire-oph/:organizationId',
  resources: '/ressources',
  'resource-detail': '/ressources/:resourceId',
  media: '/mediatheque',
  cabinet: '/cabinet-conseil',
  devis: '/cabinet-conseil/demande-devis',
  partner: '/devenir-partenaire',
  'partner-confirm': '/devenir-partenaire/confirmation',
  donate: '/faire-un-don',
  'donate-confirm': '/faire-un-don/confirmation',
  adhesion: '/adherer',
  'adhesion-form': '/adherer/demande',
  'adhesion-confirm': '/adherer/confirmation',
  contact: '/contact',
  members: '/espace-membres/connexion',
  'members-dashboard': '/espace-membres/tableau-de-bord',
  legal: '/mentions-legales',
  privacy: '/confidentialite',
  accessibility: '/accessibilite',
};

const NOT_FOUND_PATH = '/404';

const parents: Partial<Record<PageName, PageName>> = {
  'action-detail': 'actions',
  'project-detail': 'projects',
  'delegation-detail': 'delegations',
  'news-detail': 'news',
  'agenda-detail': 'agenda',
  'opportunity-detail': 'opportunities',
  'oph-detail': 'oph',
  'resource-detail': 'resources',
};

/** Construit l'URL d'une page ; `id` remplace le paramètre dynamique (ou devient `?source=` pour les dons). */
export function pagePath(page: PageName, id?: string | null): string {
  if (page === 'search' || page === 'not-found') return NOT_FOUND_PATH;
  const pattern = pagePatterns[page];
  if (pattern.includes(':')) {
    if (id) return pattern.replace(/:[A-Za-z]+/, encodeURIComponent(id));
    const parent = parents[page];
    return parent && parent !== 'search' && parent !== 'not-found' ? pagePatterns[parent] : '/';
  }
  if (page === 'donate' && id) return `${pattern}?source=${encodeURIComponent(id)}`;
  return pattern;
}

/** Retrouve la page correspondant à une URL (utile pour les états actifs du menu). */
export function pageFromPathname(pathname: string): { page: PageName; id: string | null } {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const entries = Object.entries(pagePatterns) as [PageName, string][];
  for (const [page, pattern] of entries) {
    if (!pattern.includes(':')) {
      if (pattern === clean) return { page, id: null };
      continue;
    }
    const regex = new RegExp('^' + pattern.replace(/:[A-Za-z]+/g, '([^/]+)') + '$');
    const match = clean.match(regex);
    if (match) return { page, id: decodeURIComponent(match[1]) };
  }
  return { page: 'not-found', id: null };
}
