# Portail CAPH-CI — React

Portail de la Coordination des Associations de Personnes Handicapées de Côte d'Ivoire.
Cette version reproduit **à l'identique** la maquette `CAPH-CI-React.zip` (même rendu pixel pour pixel, voir
« Validation visuelle ») tout en remplaçant son architecture par :

- **React Router** (URL réelles, historique, liens partageables) ;
- **TanStack Query** (chargement, cache, erreur, nouvelle tentative, mutations) ;
- une **couche API centralisée** (`src/api`) ;
- **MSW** pour simuler le backend ;
- **React Hook Form + Zod** pour les formulaires.

## Pile technique

React 19 · TypeScript strict · Vite · Tailwind CSS 4 · React Router 7 · TanStack Query 5 ·
React Hook Form · Zod · MSW 2 · Vitest · React Testing Library · pnpm.

## Installation et commandes

```bash
pnpm install
pnpm dev        # serveur de développement (http://localhost:5173)
pnpm typecheck  # vérification TypeScript
pnpm test       # tests Vitest
pnpm build      # typecheck + build de production (dossier dist/)
pnpm preview    # prévisualiser le build
```

## Variables d'environnement

Copier `.env.example` vers `.env` :

| Variable | Valeur par défaut | Rôle |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | URL de base de l'API (relative ou absolue, ex. `https://api.caph-ci.org/api`) |
| `VITE_ENABLE_MOCK_API` | `true` | `true` : MSW intercepte `/api/*` dans le navigateur. `false` : appels réels vers le backend |

## Structure

```
src/
  api/            client fetch (ApiError), services `api.*`, QueryClient
  components/     Header, Footer, PageHero, QueryState, forms/ (FormKit, useZodForm)
  context/        NavigationContext (couche de compatibilité Router), AuthContext
  hooks/          hooks TanStack Query (useProjects, useNews, …)
  mocks/          MSW : handlers/, data/ (fixtures), browser.ts, server.ts (tests)
  pages/          pages du portail (rendu inchangé par rapport à la maquette)
  routes/         paths.ts (table des routes), ScrollToTop, ProtectedRoute
  schemas/        schémas Zod des formulaires
  types/          types TypeScript partagés
  test/           tests Vitest + Testing Library
public/           logo, hero, médias (`public/media`), mockServiceWorker.js
```

Les composants **n'importent jamais les fixtures** : tout passe par `src/api` → hooks → pages.

## React Router

Les routes sont déclarées dans `src/App.tsx` (`<AppRoutes />`) à partir de `src/routes/paths.ts`, qui est la
source unique de vérité (pattern de chaque page).

Routes : `/`, `/la-caph-ci`, `/la-caph-ci/mission`, `/la-caph-ci/gouvernance`, `/actions[/:domainId]`,
`/projets[/:projectId]`, `/delegations[/:delegationId]`, `/actualites[/:articleId]`, `/agenda[/:eventId]`,
`/opportunites[/:opportunityId]`, `/annuaire-oph[/:organizationId]`, `/mediatheque`, `/ressources[/:resourceId]`,
`/cabinet-conseil`, `/cabinet-conseil/demande-devis`, `/transparence-impact`, `/adherer`, `/adherer/demande`,
`/adherer/confirmation`, `/devenir-partenaire`, `/faire-un-don`, `/contact`, `/espace-membres/connexion`,
`/espace-membres/tableau-de-bord` (protégée), `/mentions-legales`, `/confidentialite`, `/accessibilite`, `/*` (404).
Le don depuis un projet utilise `/faire-un-don?source=projet`.

`NavigationContext` est conservé comme **couche de compatibilité** : `useNavigation()` expose toujours
`navigate(page, id)`, `currentPage`, `selectedId` et `goBack()`, mais s'appuie sur `useNavigate`, `useLocation`
et `useSearchParams`. Cela garantit que le rendu des pages reste strictement identique. Le bouton retour utilise
l'historique du navigateur ; `ScrollToTop` remonte en haut à chaque navigation (sauf retour/avance).

### Ajouter une route

1. Ajouter le nom de page dans `PageName` et son pattern dans `pagePatterns` (`src/routes/paths.ts`).
2. Créer la page dans `src/pages/` et l'ajouter dans `AppRoutes` (`src/App.tsx`).
3. Naviguer avec `navigate('nom-de-page', id?)` ou `pagePath('nom-de-page', id)`.

## MSW (API simulée)

- Navigateur : `src/mocks/browser.ts`, démarré dans `src/main.tsx` si `VITE_ENABLE_MOCK_API=true`.
- Tests : `src/mocks/server.ts` (Node), démarré dans `src/test/setup.ts`.
- Données : `src/mocks/data/fixtures.ts`. Tout élément portant « Prototype — à valider » reçoit
  `isProvisional: true` (`src/mocks/data/provisional.ts`).
- Endpoints : `GET /api/settings|home|domains[/:id]|projects[/:id]|news[/:id]|agenda[/:id]|delegations[/:id]|`
  `opportunities[/:id]|organizations[/:id]|media|resources[/:id]|testimonials` ;
  `POST /api/forms/contact|membership|partnership|quote-request|funding-interest|donation-interest` ;
  `POST /api/auth/login|logout`.
- `projects` et `news` acceptent `?page=&pageSize=&q=`.
- Les endpoints `forms/*` valident le corps avec les **mêmes schémas Zod** que le front, ne stockent et ne
  journalisent rien, et renvoient un reçu `simulated: true`.

## TanStack Query

`src/api/queryClient.ts` : `staleTime` 60 s, pas de nouvel essai sur une 4xx, 2 essais sinon.
`QueryState` (`src/components/QueryState.tsx`) affiche l'état de chargement, l'erreur (avec « Réessayer »)
et, une fois les données reçues, le rendu inchangé de la page. Les formulaires utilisent `useMutation`.

## Remplacer les mocks par le vrai backend

1. Définir `VITE_ENABLE_MOCK_API=false` et `VITE_API_BASE_URL=https://votre-api/api`.
2. Le backend doit exposer les endpoints ci-dessus avec les formes de `src/types/index.ts`
   (listes paginées `{ items, total, page, pageSize, totalPages }` pour `projects` et `news`).
3. Les schémas Zod (`src/schemas/forms.ts`) décrivent les corps attendus ; les erreurs de validation doivent
   renvoyer un `422` avec `{ message }`.
4. Supprimer `src/mocks/` et `public/mockServiceWorker.js` quand ils ne servent plus (les tests s'appuient
   encore sur MSW : conserver `server.ts` et les handlers pour la CI).

## Ajouter un endpoint

1. Type dans `src/types/index.ts`.
2. Service dans `src/api/index.ts` (`api.xxx`).
3. Hook dans `src/hooks/queries.ts`.
4. Handler dans `src/mocks/handlers/index.ts` (+ fixtures si nécessaire).
5. Utiliser le hook dans la page, enveloppée par `<QueryState>`.

## Formulaires

`useZodForm(schema, defaults)` (`src/components/forms/useZodForm.ts`) combine React Hook Form et Zod et verrouille
la soumission pendant l'envoi (prévention des doubles envois). `FormKit` fournit `a11y()`
(`aria-invalid`, `aria-describedby`), `FieldError`, `ErrorSummary` (résumé d'erreurs, reçoit le focus) et
`ApiErrorAlert`. Les formulaires utilisent `noValidate` : la validation est entièrement gérée par Zod.
États couverts : champs requis, erreurs, chargement (« Envoi en cours… »), succès, erreur API.

## Accessibilité

Lien d'évitement, focus orange visible, A− / 100 % / 150 % / 200 %, contraste renforcé, `prefers-reduced-motion`,
zones tactiles 44 px, HTML sémantique. La visionneuse de la médiathèque se ferme avec **Échap**, se parcourt avec
**← / →**, place le focus sur « Fermer » et le restitue à la fermeture. Cible : WCAG 2.2 AA.

## Tests

`pnpm test` : routes principales et 404, navigation du header, menu mobile, outils d'accessibilité, recherche /
détail / erreur des projets, galerie média (clavier, Échap, onglets), formulaires de contact, partenariat,
adhésion, don simulé (aucune donnée bancaire envoyée), espace membres et route protégée.

## Validation visuelle

`scripts/visual-compare.py` (Playwright) compare chaque route à celle de la référence (même rendu, mêmes tailles).
Résultat de la migration : **0 pixel de différence** sur les 32 routes comparées, aux largeurs 1440, 1280, 1024,
768, 390 et 360 px, hormis les deux écarts voulus ci-dessous.

## Écarts et points à signaler (rien n'a été « refondu »)

- **Bouton « Soumettre ma demande d'adhésion »** : dans la référence il restait grisé tant que la case
  d'engagement n'était pas cochée ; il est désormais actif et la validation affiche les erreurs (nécessaire pour
  l'accessibilité : un bouton désactivé n'explique pas ce qui manque).
- **États d'erreur de formulaire** : nouveaux (message sous le champ, bordure rouge, résumé d'erreurs). Ils
  n'apparaissent qu'après une soumission invalide.
- **Don — champs de paiement** : la référence affiche des champs carte, IBAN et Mobile Money (simulation). Ils
  sont conservés à l'identique pour ne pas modifier le design, mais **ne sont jamais envoyés, stockés ni
  validés par l'API** (le schéma `donationSchema` ne les contient pas). Recommandation : les retirer ou les
  remplacer par une simple mention avant toute mise en production, conformément à la règle « ne jamais demander
  d'informations bancaires ».
- **Espace membres** : ajout de `/espace-membres/tableau-de-bord` (route protégée) car demandée par le cahier
  des charges. La connexion est une session de prototype (aucun compte réel, aucun mot de passe conservé).
- **Pages Mentions légales, Confidentialité, Accessibilité** : routes créées avec un texte « Prototype — à
  valider » ; aucun texte juridique n'a été inventé.
- **Délégations** : la liste reste vide (aucune délégation officielle n'a été fournie) ; la page est inchangée.
- **Témoignages** : `/api/testimonials` renvoie une liste vide — aucun témoignage inventé. Les témoignages codés
  en dur dans `TransparencyPage.tsx` (référence) sont inchangés.
- **Médiathèque** : les sous-titres sont indiqués par le badge « CC » ; les transcriptions n'existent pas dans les
  données de la référence et restent à fournir.
- **Navigation** : les éléments du header/footer sont des `<button>` appelant `navigate()` (comme dans la
  référence) afin de garder un rendu identique ; ils fonctionnent désormais avec les vraies URL. Migrer vers
  `<Link>`/`<NavLink>` est possible mais demande de vérifier le rendu.
- **Détail avec identifiant inconnu** (ex. `/projets/zzz`) : comme dans la référence, la liste est affichée.
- La maquette initiale référençait un fichier `.figma/make/site.json` absent de l'archive : la configuration Vite
  a été simplifiée en conséquence.
- Les images des projets (`images.unsplash.com`) sont conservées telles quelles (données provisoires).

## Déploiement

`pnpm build` produit un site statique dans `dist/`. Comme l'application utilise des routes « propres », le serveur
doit renvoyer `index.html` pour toute URL inconnue :

- **Netlify** : fichier `public/_redirects` contenant `/* /index.html 200`.
- **Nginx** : `try_files $uri /index.html;`
- **Vercel** : `rewrites` `[{ "source": "/(.*)", "destination": "/index.html" }]`.

En production avec le vrai backend : `VITE_ENABLE_MOCK_API=false`. Si l'application est servie sous un
sous-chemin, définir `base` dans `vite.config.ts`.
