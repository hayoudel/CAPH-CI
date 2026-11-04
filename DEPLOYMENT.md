# Mise en ligne du module OPH (guide de déploiement)

Ce guide décrit comment installer le module sur **un serveur Linux** (Ubuntu 22.04 ou 24.04) avec un nom de domaine, par exemple `oph.caphci.example`.
À faire **après** avoir validé le module en local. Prévoyez une demi-journée la première fois.

> Si vous n'êtes pas à l'aise avec un serveur, faites-vous accompagner par une personne technique pour cette étape. Les commandes sont données telles quelles, mais une erreur de configuration peut exposer des données de personnes.

---

## 1. Comprendre l'architecture

Il y a trois éléments sur le même serveur :

```
Visiteur ──HTTPS──► nginx ──┬──► fichiers du site (frontend/dist)         pour  https://oph.caphci.example/
                            └──► API Node.js (port 3000, interne)          pour  https://oph.caphci.example/api/…
                                         │
                                         └──► PostgreSQL (port 5432, interne) + dossier de fichiers privés
```

**Règle essentielle : le site et l'API doivent être sur le même nom de domaine.**
Le cookie de session est volontairement très strict (`SameSite=Strict`, réservé à `/api/v1/auth`, `Secure` en production). Si le site est sur `a.example` et l'API sur `b.example`, la connexion ne tiendra pas. Avec nginx qui aiguille `/api/` vers l'API, tout est sur le même domaine : rien à régler.

PostgreSQL et l'API ne doivent **jamais** être joignables depuis Internet : seul nginx (ports 80 et 443) l'est.

---

## 2. Ce qu'il faut préparer

| Élément | Détail |
|---|---|
| Serveur | 2 Go de mémoire minimum, 20 Go de disque minimum (les pièces jointes grossissent avec le temps) |
| Nom de domaine | pointant vers l'adresse IP du serveur (enregistrement A) |
| Logiciels | Node.js 20 ou plus, PostgreSQL 16, nginx, certbot, git |
| E-mail d'envoi | un compte SMTP (fournisseur d'envoi d'e-mails ou messagerie de la CAPH-CI) |
| Pare-feu | n'ouvrir que les ports 22 (administration), 80 et 443 |

Installation des logiciels (exemple Ubuntu) :

```bash
sudo apt update
sudo apt install -y nginx postgresql git certbot python3-certbot-nginx ufw
# Node.js 20 : suivre https://nodejs.org (ou NodeSource) puis vérifier :
node -v    # doit afficher v20 ou plus
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

---

## 3. Base de données

```bash
sudo -u postgres psql
```
Puis, dans l'invite PostgreSQL (remplacez le mot de passe par un mot de passe long et unique) :
```sql
CREATE USER caphci WITH PASSWORD 'UN_MOT_DE_PASSE_LONG_ET_UNIQUE';
CREATE DATABASE caphci_oph OWNER caphci;
\q
```

---

## 4. Récupérer le code et configurer l'API

```bash
sudo mkdir -p /srv/caphci && sudo chown $USER /srv/caphci
cd /srv/caphci
git clone https://github.com/VOTRE-COMPTE/VOTRE-DEPOT.git app
cd app/backend
npm ci
```

**Vérifiez que le dossier `backend/prisma/migrations/` est bien dans votre dépôt GitHub.** Il est créé par `npx prisma migrate dev` lors de la première installation en local et il doit être **commité** (`git add .`). Sans lui, la base de production ne peut pas être créée.

### Le fichier `.env` de production

```bash
cp .env.example .env
nano .env
```

Valeurs à renseigner (les autres peuvent rester par défaut) :

| Variable | Valeur en production |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `APP_URL` | `https://oph.caphci.example` (sert aux liens des e-mails) |
| `CORS_ORIGINS` | `https://oph.caphci.example` (exactement, sans `/` final) |
| `TRUST_PROXY` | `1` (un seul nginx devant l'API) |
| `SWAGGER_ENABLED` | `false` |
| `DATABASE_URL` | `postgresql://caphci:LE_MOT_DE_PASSE@localhost:5432/caphci_oph` |
| `JWT_ACCESS_SECRET` | généré : `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | généré (une autre valeur) : `openssl rand -base64 48` |
| `FILES_ENCRYPTION_KEY` | généré : `openssl rand -base64 32` |
| `STORAGE_DIR` | `/srv/caphci/storage` (créer le dossier, voir plus bas) |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | ceux de votre fournisseur d'e-mail |
| `MEMBERSHIP_NOTIFY_EMAIL` | l'adresse qui doit être prévenue à chaque nouveau dossier d'adhésion |
| `SEED_DEMO` | `false` (**jamais `true` en production**) |
| `SEED_ADMIN_EMAIL` | l'e-mail du premier administrateur |
| `SEED_ADMIN_PASSWORD` | un mot de passe fort (12 caractères minimum, majuscule, minuscule, chiffre, symbole) |

L'API refuse de démarrer en production si `FILES_ENCRYPTION_KEY` manque ou si les secrets JWT sont ceux d'exemple : c'est voulu.

> **Gardez une copie de `FILES_ENCRYPTION_KEY` dans un endroit sûr, séparé du serveur** (gestionnaire de mots de passe). Elle protège les pièces d'identité des dossiers d'adhésion : sans elle, ces fichiers sont définitivement illisibles, même avec une sauvegarde.

Protégez le fichier : `chmod 600 .env`. Ne le mettez jamais sur GitHub.

### Construire, créer les tables, premières données

```bash
sudo mkdir -p /srv/caphci/storage && sudo chown $USER /srv/caphci/storage && chmod 700 /srv/caphci/storage
npx prisma generate
npm run build
npx prisma migrate deploy      # crée les tables (n'efface jamais de données)
npm run prisma:seed            # crée les rôles, les permissions, le barème et le compte administrateur
```

Si la commande `prisma:seed` échoue avec une erreur de téléchargement, utilisez à la place : `npx ts-node --transpile-only prisma/seed.ts`.

---

## 5. Lancer l'API en service permanent (systemd)

Créez `/etc/systemd/system/caphci-api.service` (`sudo nano …`) en remplaçant `UTILISATEUR` par l'utilisateur Linux qui possède `/srv/caphci` :

```ini
[Unit]
Description=CAPH-CI API (module OPH)
After=network.target postgresql.service

[Service]
Type=simple
User=UTILISATEUR
WorkingDirectory=/srv/caphci/app/backend
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now caphci-api
sudo systemctl status caphci-api          # doit afficher « active (running) »
curl http://localhost:3000/api/v1/health  # doit répondre {"status":"ok","database":"up",…}
journalctl -u caphci-api -n 50            # lire les derniers messages en cas de problème
```

---

## 6. Construire le site

```bash
cd /srv/caphci/app/frontend
npm ci
npm run build
sudo mkdir -p /var/www/caphci
sudo rsync -a --delete dist/ /var/www/caphci/
```

Aucune variable n'est nécessaire côté site : il appelle l'API sur le même domaine.

---

## 7. nginx (site, API et HTTPS)

Créez `/etc/nginx/sites-available/caphci` en remplaçant le nom de domaine :

```nginx
server {
    listen 80;
    server_name oph.caphci.example;

    root /var/www/caphci;
    index index.html;

    # Pièces jointes : 10 Mo + marge pour le formulaire
    client_max_body_size 12m;

    # API : relayée vers Node.js. L'adresse du visiteur est transmise (TRUST_PROXY=1).
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Site : toute adresse inconnue renvoie index.html (le site gère lui-même ses pages)
    location / {
        try_files $uri /index.html;
    }

    # Les fichiers générés portent un nom unique : on peut les garder longtemps en cache
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }
    location = /index.html { add_header Cache-Control "no-cache"; }

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "DENY" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/caphci /etc/nginx/sites-enabled/caphci
sudo nginx -t                                  # doit afficher « syntax is ok »
sudo systemctl reload nginx
sudo certbot --nginx -d oph.caphci.example     # active HTTPS et la redirection automatique
```

Ouvrez ensuite `https://oph.caphci.example` : la page d'accueil s'affiche. Connectez-vous avec le compte administrateur créé à l'étape 4.

---

## 8. Sauvegardes (indispensable)

Deux choses à sauvegarder chaque jour : **la base** et **le dossier des fichiers**. Gardez au moins 14 jours d'historique, et **copiez-les hors du serveur** (autre machine, stockage externe).

Exemple de script `/srv/caphci/backup.sh` :

```bash
#!/bin/bash
set -e
DATE=$(date +%F)
DEST=/srv/caphci/backups
mkdir -p "$DEST"
PGPASSWORD='LE_MOT_DE_PASSE' pg_dump -h localhost -U caphci caphci_oph | gzip > "$DEST/base-$DATE.sql.gz"
tar -czf "$DEST/fichiers-$DATE.tar.gz" -C /srv/caphci storage
find "$DEST" -type f -mtime +14 -delete
```
```bash
chmod 700 /srv/caphci/backup.sh
sudo crontab -e    # ajouter la ligne : 30 2 * * * /srv/caphci/backup.sh
```

**Testez la restauration au moins une fois** sur une autre machine : une sauvegarde jamais restaurée n'est pas une sauvegarde.
Restaurer la base : `gunzip -c base-AAAA-MM-JJ.sql.gz | psql -h localhost -U caphci caphci_oph`.

---

## 9. Mettre à jour le module plus tard

```bash
cd /srv/caphci/app
git pull
cd backend  && npm ci && npm run build && npx prisma migrate deploy
# Si la mise à jour touche aux rôles ou aux permissions : npm run prisma:seed
sudo systemctl restart caphci-api
cd ../frontend && npm ci && npm run build && sudo rsync -a --delete dist/ /var/www/caphci/
```
Faites toujours une sauvegarde juste avant (étape 8).

---

## 10. Liste de contrôle avant l'ouverture au public

À cocher une par une :

- [ ] Le site s'ouvre en `https://` et `http://` redirige vers `https://`
- [ ] `NODE_ENV=production`, `SEED_DEMO=false`, `SWAGGER_ENABLED=false`, `TRUST_PROXY=1`
- [ ] Aucun compte de démonstration (`@caphci.local`, `@horizon-inclusif.example`) n'existe : si la base a déjà reçu les données de démonstration, repartir d'une base vide
- [ ] Le mot de passe administrateur est fort et connu d'une seule personne ; l'e-mail administrateur est une vraie adresse
- [ ] Les secrets (`JWT_*`, `FILES_ENCRYPTION_KEY`) sont uniques, absents de GitHub, et `FILES_ENCRYPTION_KEY` est copiée dans un coffre
- [ ] `curl http://IP_DU_SERVEUR:3000` et `psql` depuis l'extérieur **échouent** (API et base non exposées)
- [ ] Un e-mail réel part et arrive : tester « mot de passe oublié » avec une vraie adresse, vérifier que le message n'atterrit pas dans les courriers indésirables
- [ ] Une sauvegarde automatique a tourné et a été **restaurée** avec succès sur une autre machine
- [ ] Un dossier d'adhésion de test passe de bout en bout (dépôt, pièces jointes, suivi) puis est supprimé
- [ ] Les textes légaux sont validés par la CAPH-CI (voir ci-dessous)

---

## 11. Points à confirmer avec la CAPH-CI avant l'ouverture

Ces points ne sont pas techniques ; ils demandent une décision ou des informations de la Coordination :

1. **Informations de contact** affichées en bas du site (adresse, téléphone, e-mail) : actuellement provisoires.
2. **Logo** : la version actuelle est une image ; une version vectorielle (SVG) serait plus nette.
3. **Politique de confidentialité et mentions légales** : le module collecte des données personnelles (noms, e-mails, téléphones, pièces d'identité). Un texte validé par la CAPH-CI doit être publié, avec la durée de conservation des dossiers refusés ou abandonnés. Voir la loi ivoirienne n° 2013-450 sur la protection des données à caractère personnel et l'ARTCI.
4. **Attestations et cartes de membre** (PDF) : non générées pour l'instant. À prévoir si la CAPH-CI les souhaite.
5. **Communications aux organisations** : elles sont visibles dans l'espace membre, mais ne sont pas envoyées par e-mail. À décider.
6. **Écrans du personnel de la CAPH-CI** (traitement des adhésions, publication de contenus, validation des rapports et actualités) : l'API est complète et testée, mais les écrans correspondants ne sont pas dans ce module. Tant qu'ils n'existent pas, ces actions se font via l'interface technique de l'API (Swagger, désactivée en production) ou par un développeur. À planifier.

---

## 12. Dépannage

| Problème | Que vérifier |
|---|---|
| Page blanche sur `/…` après un rafraîchissement | la ligne `try_files $uri /index.html;` est-elle dans nginx ? |
| « Impossible de joindre le serveur » | `sudo systemctl status caphci-api` et `journalctl -u caphci-api -n 50` |
| L'API ne démarre pas : « Configuration invalide » | le message liste la variable manquante dans `.env` |
| On est déconnecté à chaque rafraîchissement | le site et l'API sont-ils bien sur le même domaine, en HTTPS ? |
| Tout le monde reçoit « Trop de tentatives » | `TRUST_PROXY=1` manque, ou `X-Forwarded-For` n'est pas transmis par nginx |
| Envoi de fichier refusé, erreur 413 | `client_max_body_size` dans nginx |
| Aucun e-mail reçu | `MAIL_*` dans `.env` ; regarder `journalctl -u caphci-api` pour l'erreur d'envoi |
