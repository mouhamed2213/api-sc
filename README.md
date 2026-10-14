# Support Connecté — API (Node.js · Express · TypeScript · Prisma · PostgreSQL)

Backend des fiches connectées : comptes clients (inscription libre), fiches, formules (Essentielle / Pro / Signature),
abonnements et contrôle des droits par formule.

## Démarrage

```bash
npm install
cp .env.example .env          # puis mets un vrai JWT_SECRET (voir le fichier)
docker compose up -d          # PostgreSQL local (ou utilise ta propre base : DATABASE_URL)

# 1) Créer les tables — en deux temps pour ajouter l'index unique partiel (voir plus bas)
npx prisma migrate dev --name init --create-only
#    -> ouvre prisma/migrations/<date>_init/migration.sql et ajoute à la fin :
#       CREATE UNIQUE INDEX "subscriptions_one_active_per_fiche"
#       ON "subscriptions" ("ficheId") WHERE "status" = 'ACTIVE';
npx prisma migrate dev        # applique la migration + génère le client Prisma

# 2) Remplir les formules et leurs limites
npm run prisma:seed

# 3) Créer un compte admin (le seul moyen d'en avoir un)
npm run create-admin -- admin@exemple.sn "UnMotDePasseSolide"

# 4) Lancer
npm run dev                   # http://localhost:4000/api/health
```

Production : `npm run build && npm run prisma:deploy && npm start` (PM2 + Nginx comme d'habitude).

## Structure

```
prisma/
  schema.prisma        # tables (User, Fiche, Plan, PlanLimit, Subscription, blocs de contenu…)
  seed.ts              # les 3 formules et leurs quotas, repris de plans.js
src/
  server.ts            # démarrage + tâche horaire d'expiration des abonnements
  app.ts               # helmet, cors, rate limit, routes
  config/env.ts        # variables d'environnement validées (zod)
  lib/                 # prisma, jwt, mots de passe, erreurs HTTP, mails (simulés), tokens
  middlewares/         # requireAuth, requireRole, validate (zod), errorHandler
  modules/
    auth/              # register, login, me, vérification e-mail, mot de passe oublié
    plans/             # GET /plans (public)
    subscriptions/     # abonnement effectif, activation, expiration
    fiches/            # schémas zod, contrôle des limites, DTO, service, routes
    admin/             # slug, statut, propriétaire, activation d'une formule
scripts/create-admin.ts
```

## Routes (préfixe `/api`)

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| POST | `/auth/register` | public | crée un compte CLIENT (+ e-mail de confirmation) |
| POST | `/auth/login` | public | retourne `{ user, token }` |
| GET | `/auth/me` | connecté | profil |
| POST | `/auth/verify-email` · `/auth/resend-verification` | public · connecté | confirmation d'e-mail |
| POST | `/auth/forgot-password` · `/auth/reset-password` | public | mot de passe oublié |
| GET | `/plans` | public | formules et limites |
| GET | `/fiches/public/:slug` | public | la fiche affichée par le scan NFC/QR |
| GET | `/fiches` | connecté | mes fiches (admin : toutes) |
| POST | `/fiches` | connecté | crée une fiche Essentielle gratuite |
| GET | `/fiches/:id` | propriétaire / admin | une fiche |
| PATCH | `/fiches/:id` | propriétaire / admin | modifie l'identité et `data` (limites de la formule vérifiées) |
| PATCH | `/admin/fiches/:id` | admin | `slug`, `statut` (`active`/`suspendue`), `userId` |
| POST | `/admin/fiches/:id/subscription` | admin | active une formule `{ plan, endsAt?, amountFcfa?, paymentRef? }` |

Authentification : en-tête `Authorization: Bearer <token>`.
Erreurs : toujours `{ "error": { "code", "message", "details?" } }`.

```bash
curl -X POST localhost:4000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"awa@exemple.sn","password":"motdepasse123","nom":"Awa"}'
curl -X POST localhost:4000/api/fiches -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"prenom":"Awa","nom":"Ndiaye","fonction":"Coiffeuse","secteur":"beaute"}'
```

## Règles appliquées côté serveur

- **Propriété** : un client ne voit et ne modifie que ses fiches (sinon 404). L'admin voit tout.
- **Champs réservés** : `slug`, `formule`, `statut`, `dateEcheance`, `scansTotal`, `userId` sont ignorés si un client les envoie. Seules les routes `/admin` les modifient.
- **Formule effective** d'une fiche = son abonnement `ACTIVE` non expiré. Sans abonnement valide : modification bloquée (`ABONNEMENT_EXPIRE`). Fiche `suspendue` : modification bloquée pour le client.
- **Limites par formule** (table `plan_limits`) : blocs autorisés, onglets libres, présentation, réseaux, liens, photos/vidéos, catalogue (sections, articles, prix), menu, biens, entête, thèmes. En cas de dépassement : 422 `LIMITES_DEPASSEES` avec la liste de **toutes** les violations.
- **`PATCH /fiches/:id`** : une liste fournie (liens, galerie, onglets, catalogue, menu, biens…) **remplace** l'existante ; une liste absente n'est pas touchée.
- **Format de la fiche** : `GET` renvoie `{ ...champs à plat, formule, dateEcheance, data: {...} }`, le même format que `src/data/fiches.js` du module front. Les ids des onglets viennent de la base (ne pas réutiliser les `o1`, `o2` du front).
- **Sécurité** : mots de passe bcrypt, rôle `CLIENT` forcé à l'inscription, `ADMIN` seulement via le script, JWT relu en base à chaque requête, URL `javascript:` refusées, rate limit (global + `/auth`), helmet, CORS limité à `CORS_ORIGIN`.

## Ce qui reste à faire / à décider

1. **Envoi des e-mails** : `src/lib/mailer.ts` affiche seulement dans la console. Brancher Resend, Brevo ou SMTP.
2. **Comptage des passages (scans)** : non implémenté. La page publique ne compte rien ; à faire sur une route dédiée NFC/QR, sans compter les aperçus admin.
3. **Upload d'images et vidéos** : l'API reçoit des URL. Prévoir un stockage (fichiers sur le VPS ou S3) avec limite de poids ; la durée max des vidéos du menu (30 s) ne peut être vérifiée que là.
4. **Réorganisation des blocs** (`canReorder`) : non contrôlée côté serveur ; pour l'instant l'ordre envoyé est conservé.
5. **Paiement** : l'activation d'une formule est manuelle (route admin). Brancher Wave / Orange Money quand tu seras prêt (`paymentRef` est déjà là).
6. **Rattachement d'une carte physique** (`claimCode`) : colonne prévue, route non écrite.
7. **`MAX_FICHES_PER_USER`** (3 par défaut) : limite de fiches gratuites par compte, à confirmer.
8. **Prix et durées** des formules dans `prisma/seed.ts` : à confirmer.
9. **Tests automatisés** : aucun pour l'instant.
# api-sc
