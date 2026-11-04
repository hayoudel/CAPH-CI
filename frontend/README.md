# CAPH-CI OPH — Frontend

React 18 + Vite + TypeScript. Charte graphique CAPH-CI, accessibilité WCAG 2.2 AA.

## Lancer en local

1. Démarrer l'API (dans `backend`) : `npm run start:dev` (port 3000).
2. Dans `frontend` : 
   ```
   npm install --legacy-peer-deps
   npm run dev
   ```
3. Ouvrir http://localhost:5173

Vite redirige `/api` vers `http://localhost:3000` : aucune configuration CORS n'est nécessaire en local.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm test` | tests (Vitest) |
| `npm run typecheck` | vérification TypeScript |
| `npm run build` | version de production dans `dist/` |

## Comptes de démonstration
Mot de passe : `Demo-Passw0rd!2026`
- `admin@caphci.local` (personnel, tous droits)
- `awa.kone@horizon-inclusif.example` (présidente d'une organisation membre)

## Principes
Jeton d'accès gardé en mémoire (jamais dans le navigateur), session renouvelée par cookie httpOnly, polices hébergées localement, navigation au clavier, texte 18 px, cibles 44 px.

## Pages disponibles (F1 à F3)
| Adresse | Qui | Contenu |
|---|---|---|
| `/adhesion` | tout le monde | conditions, pièces à fournir, droits d'adhésion |
| `/adhesion/demande` | tout le monde | formulaire en 7 étapes (brouillon enregistré à chaque étape) |
| `/adhesion/reprendre` | tout le monde | lien reçu par e-mail pour reprendre un brouillon |
| `/adhesion/suivi` | tout le monde | suivi d'un dossier déposé (référence + e-mail + code) |
| `/annuaire`, `/annuaire/:id` | tout le monde | recherche et fiches publiques des organisations |
| `/connexion` | tout le monde | connexion, mot de passe oublié |
| `/espace` | organisations | tableau de bord |
| `/espace/organisation` | organisations | profil (modifiable par le Président) |
| `/espace/equipe` | organisations | équipe : inviter, changer le rôle, retirer |
| `/espace/annuaire` | organisations | consentement et visibilité dans l'annuaire |
| `/espace/communications`, `/espace/communications/:id` | organisations | messages de la CAPH-CI (ouvrir un message le marque comme lu) |
| `/espace/documents` | organisations | bibliothèque : recherche, filtre par catégorie, téléchargement |
| `/espace/opportunites`, `/espace/opportunites/:id` | organisations | appels à projets, formations… + fiche à télécharger |
| `/espace/agenda` | organisations | événements à venir ou passés |
