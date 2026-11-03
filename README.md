# CAPH-CI — Module OPH

Espace membres, parcours d'adhésion et gestion des adhésions des OPH.
**Lot B1 (socle)** : base PostgreSQL, schéma Prisma, données de départ, Swagger, audit, mail.  
**Lot B2a (connexion et droits)** : authentification, session sécurisée, mot de passe oublié, invitations, permissions, profil, gestion des comptes.  
**Lot B2b (organisations)** : profil de l'organisation, membres (invitations), visibilité publique champ par champ, annuaire public.  
**Lot B3 (adhésion, demandeur)** : formulaire d'adhésion « Organisation », pièces jointes sécurisées, référence de dossier, suivi public.
**Lot B5 (espace membre)** : documents, opportunités, communications avec suivi de lecture, agenda, rapports, actualités, tableau de bord, journal d'audit.
**Lot B4 (adhésion, personnel CAPH-CI)** : liste et filtres, examen des pièces, compléments, décision, paiement, enregistrement du membre.

## Prérequis
- Node.js 20 ou 22 et npm
- Docker Desktop (pour PostgreSQL et la boîte mail de test), ou un PostgreSQL 16 installé

## Installation (à faire une seule fois)

```bash
# 1. Démarrer la base de données et la boîte mail de test
docker compose up -d

# 2. Installer le backend
cd backend
npm install
cp .env.example .env          # puis remplacer les 2 secrets JWT (voir ci-dessous)

# 3. Créer les tables (génère la 1re migration dans prisma/migrations/)
npx prisma migrate dev --name init

# 4. Insérer les données de départ (rôles, permissions, barème, comptes de démonstration)
npm run prisma:seed

# 5. Lancer l'API
npm run start:dev
```

Générer un secret : `openssl rand -base64 48` (à faire pour `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET`).

## Si une commande échoue
- **« port 5432 already in use »** : un PostgreSQL local occupe déjà le port. Ce projet utilise donc le port **5433** (déjà configuré dans `docker-compose.yml` et `.env.example`). Si vous avez déjà copié l'ancien `.env`, remplacez `localhost:5432` par `localhost:5433` dans `DATABASE_URL`.
- **« port 1025 / 8025 already in use »** : changez le port de gauche dans `docker-compose.yml` (et `MAIL_PORT` dans `.env` si vous modifiez 1025).

## Vérifier que tout fonctionne
- Santé : http://localhost:3000/api/v1/health → `{"status":"ok","database":"up",...}`
- Documentation Swagger : http://localhost:3000/api/docs
- E-mails de test (Mailpit) : http://localhost:8025
- Base de données : `npx prisma studio`

## Se connecter dans Swagger (B2a)
1. Ouvrez http://localhost:3000/api/docs
2. Déroulez **POST /api/v1/auth/login** → *Try it out*, saisissez `awa.kone@horizon-inclusif.example` et `Demo-Passw0rd!2026` → *Execute*.
3. Copiez la valeur de `accessToken` dans la réponse.
4. Cliquez sur **Authorize** (en haut à droite), collez le jeton, validez.
5. Testez **GET /api/v1/users/me** : vous voyez votre profil, votre OPH et vos permissions.
6. Reconnectez-vous avec `fatou.diallo@horizon-inclusif.example` (Consultation) puis essayez **GET /api/v1/admin/users** : réponse **403**. Avec `admin@caphci.local` : réponse **200**.

Le jeton d'accès dure 15 minutes ; au-delà, refaites un login (le frontend le renouvellera tout seul via `/auth/refresh`).
Les e-mails (réinitialisation, invitation) sont visibles dans Mailpit : http://localhost:8025

## Tester le lot B2b dans Swagger
1. **Annuaire public** (aucune connexion nécessaire) : ouvrez **GET /api/v1/directory/organizations** → *Try it out* → *Execute*. Vous voyez « Association Horizon Inclusif », uniquement avec ses informations publiques (pas d'adresse du siège, pas d'e-mail privé).
2. Connectez-vous en **Awa Koné** (voir plus haut) et cliquez sur **Authorize**.
3. **GET /api/v1/organizations/me** : le profil complet de l'organisation. Copiez son `id`.
4. **GET /api/v1/organizations/{id}/visibility** (collez l'id) : ce qui est visible dans l'annuaire.
5. **PATCH /api/v1/organizations/{id}/visibility** avec `{"fieldVisibility": {"publicEmail": false}}` puis rechargez l'annuaire : l'e-mail public a disparu.
6. **POST /api/v1/organizations/{id}/members** avec `{"email":"nouveau@exemple.org","firstName":"Nouveau","lastName":"Membre","roleCode":"OPH_VIEWER"}` : l'invitation apparaît dans Mailpit (http://localhost:8025).
7. Reconnectez-vous en **Fatou Diallo** (Consultation) et essayez ces deux dernières actions : réponse **403**.

## Tester le lot B3 dans Swagger (aucune connexion nécessaire)
Section **Adhésion (demandeur)** de http://localhost:3000/api/docs :
1. **GET /memberships/requirements** → Execute. Repérez dans `options` un `regionId`, un `delegationId` et un `domains[].id` (utiles à l'étape 4).
2. **POST /memberships/requests** avec `{"categoryCode":"PM_ORGANISATION","applicantName":"Votre Nom","applicantEmail":"vous@exemple.org"}`. Copiez **`id`** et **`trackingCode`** (le code est aussi dans Mailpit, http://localhost:8025).
3. Pour toutes les routes suivantes, collez le code dans le champ **x-tracking-code** et l'`id` dans le champ `id`.
4. **PATCH /memberships/requests/{id}** avec le corps ci-dessous (remplacez les trois identifiants par ceux de l'étape 1) :
```json
{
  "delegationId": "<delegations[0].id>",
  "data": {
    "organization": { "name": "Association Test Swagger", "address": "Rue des Jardins, Yopougon", "regionId": "<regions[0].id>", "commune": "Yopougon", "interventionDomainIds": ["<domains[0].id>"], "interventionZone": "District d'Abidjan", "legalReference": "REC-TEST-001", "phone": "+225 07 00 00 00 00", "email": "contact@test.example" },
    "representative": { "name": "Awa Koné", "function": "Présidente", "phone": "+225 07 11 11 11 11", "email": "awa@test.example" },
    "secretaryGeneral": { "name": "Koffi Yao", "contact": "0700000000" },
    "treasurer": { "name": "Fatou Diallo", "contact": "0500000000" }
  }
}
```
5. **POST …/documents** (3 fois) : `type` = `LEGAL_REGISTRATION`, puis `STATUTES`, puis `REPRESENTATIVE_ID`, avec un petit fichier PDF, JPG ou PNG. Essayez aussi un fichier texte renommé en .pdf : il est refusé.
6. **GET /memberships/requests/{id}** : `completeness.complete` doit valoir `true`.
7. **POST …/submit** avec `{"acceptAccuracy":true,"acceptStatutes":true,"acceptDataProcessing":true,"signerName":"Votre Nom"}`. Vous obtenez une **référence** `CAPH-2026-000001` et le statut « Dossier reçu » (jamais « admis »).
8. **POST /memberships/track** avec la référence, l'e-mail et le code : vous voyez le statut, rien d'autre.

Les fichiers sont enregistrés dans `backend/storage/` (dossier privé, noms aléatoires). Les pièces d'identité sont chiffrées si `FILES_ENCRYPTION_KEY` est renseignée dans `.env` (générer : `openssl rand -base64 32`).

## Tester le lot B4 dans Swagger (personnel CAPH-CI)

1. Créez d'abord un dossier côté demandeur (voir le guide B3 ci-dessus) jusqu'à `POST /memberships/requests/{id}/submit`.
2. Cliquez sur **Authorize** et connectez-vous avec `gestionnaire@caphci.local` / `Demo-Passw0rd!2026` (voir « Se connecter dans Swagger »). Ce compte peut examiner **et** enregistrer les décisions.
3. Dans la section **Adhésions (personnel CAPH-CI)** :
   - `GET /admin/memberships/stats` puis `GET /admin/memberships` : compteurs et liste (filtres `status`, `q`, `from`, `to`…). Copiez l'`id` de votre dossier.
   - `GET /admin/memberships/{id}` : détail complet (données, pièces, historique, barème, alertes de doublon).
   - `GET /admin/memberships/{id}/documents/{docId}/file` : ouvre la pièce (lecture enregistrée dans le journal d'audit).
   - `POST /admin/memberships/{id}/start-review` : le dossier passe « en cours d'examen ».
   - `PATCH /admin/memberships/{id}/documents/{docId}` avec `{"status":"ACCEPTED"}` pour **chaque** pièce obligatoire.
   - (option) `POST .../request-info` avec `{"message":"Merci de fournir un récépissé lisible."}` : le demandeur est prévenu par e-mail (visible sur http://localhost:8025).
   - `POST .../decision` avec `{"outcome":"ADMITTED","body":"BOARD","decisionReference":"CA-2026-014","decidedAt":"2026-11-03"}`.
   - `POST .../payment` avec `{"method":"CASH","receiptNumber":"REC-2026-0001"}` : les montants viennent du barème (32 000 FCFA pour une organisation).
   - `POST .../register` avec `{}` : l'organisation est créée, un numéro `OPH-0001` est attribué, et le Président reçoit une invitation (e-mail dans Mailpit).

## Tester le lot B5 dans Swagger (espace membre)

Connectez-vous avec le compte indiqué pour chaque essai (**Authorize**, voir « Se connecter dans Swagger »). Tous les mots de passe : `Demo-Passw0rd!2026`.

| Section Swagger | Qui publie / traite | Qui consulte |
|---|---|---|
| Documents | `communication@caphci.local` | `fatou.diallo@…` (Consultation), `awa.kone@…` (Président) |
| Opportunités | `admin@caphci.local` | tous les membres ; les opportunités « PUBLIC » aussi sans connexion |
| Communications | `communication@caphci.local` | `awa.kone@…` |
| Agenda | `communication@caphci.local` | tous les membres |
| Rapports | `awa.kone@…` ou `koffi.yao@…` envoient ; `admin@caphci.local` traite | l'organisation |
| Actualités | `awa.kone@…` propose ; `communication@caphci.local` valide | public une fois publiée |

Essais conseillés :
1. **Document** : `POST /documents` (communication@) avec un titre, une catégorie et un PDF. Mettez `accessLevel` à `CONTRIBUTORS` : Fatou ne le voit plus, Awa oui.
2. **Communication** : `POST /communications` (communication@), puis `GET /communications` (awa@) : le message est « non lu ». Ouvrez-le avec `GET /communications/{id}`, puis consultez `GET /communications/{id}/stats` (communication@) : le nombre de lecteurs augmente.
3. **Rapport** : `POST /reports` (awa@) avec `certifyAuthority: true`, joignez un PDF, puis `POST /reports/{id}/review` (admin@) avec `CORRECTION_REQUESTED` et une note. Awa corrige avec `PATCH /reports/{id}` : le rapport repart tout seul à la CAPH-CI.
4. **Actualité** : `POST /news` (awa@), `POST /admin/news/{id}/review` (communication@) avec `APPROVED` puis `PUBLISHED`, puis `GET /public/news` (sans connexion).
5. **Tableau de bord** : `GET /dashboard` avec awa@ (vue organisation) puis admin@ (vue équipe).
6. **Journal d'audit** : `GET /admin/audit?action=report.` (admin@).

Les routes `/public/...` (opportunités, communiqués, agenda, actualités) n'exigent aucune connexion.

## Lancer les tests automatiques de sécurité
```bash
cd backend
npm run test:e2e        # 117 tests ; base et seed démo requis
```

## Comptes de démonstration (SEED_DEMO=true uniquement)
Mot de passe commun : `Demo-Passw0rd!2026`

| Compte | Rôle |
|---|---|
| admin@caphci.local | Administrateur général |
| gestionnaire@caphci.local | Gestionnaire des adhésions + habilité aux décisions |
| communication@caphci.local | Responsable communication |
| awa.kone@horizon-inclusif.example | Président de l'OPH |
| koffi.yao@horizon-inclusif.example | Contributeur |
| fatou.diallo@horizon-inclusif.example | Consultation |

En production : `SEED_DEMO=false` et un `SEED_ADMIN_PASSWORD` fort.

## Commandes utiles (dans `backend/`)
| Commande | Effet |
|---|---|
| `npm run start:dev` | API en mode développement (rechargement auto) |
| `npm run build` | Compile vers `dist/` |
| `npm run test:e2e` | Tests automatiques d'authentification et de permissions |
| `npm run typecheck` | Vérifie les types sans compiler |
| `npx prisma migrate dev --name <nom>` | Crée et applique une migration après modification du schéma |
| `npm run prisma:seed` | Relance les données de départ (sans doublons) |
| `npm run db:reset` | Efface et recrée toute la base (développement uniquement) |

## Structure
```
backend/
  prisma/schema.prisma      Modèle de données (33 modèles)
  prisma/seed.ts            Données de départ
  src/
    config/                 Validation du .env
    prisma/                 Accès base (client Prisma sans moteur Rust + adaptateur pg)
    common/                 Permissions, décorateurs, filtre d'erreurs, pagination, mots de passe
    auth/                   Connexion, session, mot de passe, gardes (JWT + permissions)
    users/                  Profil personnel, gestion des comptes (admin)
    organizations/          Profil de l'OPH, membres, visibilité publique
    directory/              Annuaire public (n'expose que les champs autorisés)
    memberships/            Parcours d'adhésion du demandeur (brouillon, pièces, dépôt, suivi)
    storage/                Stockage privé des fichiers (chiffrement des pièces d'identité)
    audit/                  Journal d'audit
    mail/                   Envoi d'e-mails
    health/                 Route /health
```

## Frontend (lots F1 à F3)
Voir `frontend/README.md`. Lancer l'API (`backend`, `npm run start:dev`) puis, dans `frontend`, `npm install --legacy-peer-deps` et `npm run dev` → http://localhost:5173

## Rôles dans une organisation (OPH)
| Rôle | Peut faire |
|---|---|
| Président | tout, y compris nommer un Suppléant |
| Suppléant du Président | tout ce que fait le Président, en son absence (profil, annuaire, équipe), sauf nommer/retirer un autre Suppléant ou toucher au Président |
| Contributeur | lire, envoyer des rapports, proposer des actualités |
| Consultation | lire seulement |

Après une mise à jour du backend contenant ce rôle, relancer une fois : `npx prisma db seed` (dans `backend`).
