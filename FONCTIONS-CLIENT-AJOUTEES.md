# Fonctions côté client ajoutées à dre (venues de api-sc-main)

## Mise en route
```powershell
npm install                       # ajoute @aws-sdk/client-s3
npx prisma migrate dev            # applique 20261017100000_client_features (paiements, passages, rappels) + régénère le client
npm run dev
```
Stockage des médias (S3) : facultatif. Sans les variables S3_* du `.env`, tout marche sauf l'importation de photos/vidéos (réponse 503 « stockage non configuré »).

## Nouvelles routes
| Route | Accès | Rôle |
|---|---|---|
| `GET /api/client/dashboard/fiches` | client connecté | fiches du client avec leur formule active |
| `GET /api/subscription/kpi` | connecté | nombre de fiches, actives, payantes |
| `POST /api/subscription/upgrade` | client | demande de passage Pro/Signature (crée un paiement en attente) |
| `POST /api/subscription/payments/:paymentId/simulate-confirmation` | client | confirme le paiement simulé et active la formule (désactivé en production) |
| `GET /api/subscription/filter?plan=pro` | connecté | liste des formules actives, filtrable |
| `POST /api/fiches/public/:slug/passages` | public | enregistre une ouverture de la fiche (qr / nfc / direct), sans doublon |
| `POST /api/fiches/public/:slug/rappels` | public | demande de rappel laissée par un visiteur |
| `GET /api/fiches/rappels?page=&limit=` | client | toutes ses demandes de rappel |
| `GET /api/fiches/:id/rappels` | propriétaire / admin | rappels d'une fiche |
| `GET /api/fiches/:id/stats?granularity=day|month&date=&month=` | propriétaire / admin | statistiques de passages |
| `POST /api/fiches/:id/media` | propriétaire / admin | upload binaire d'une photo ou vidéo (optimisée par FFmpeg) |
| `GET /api/media/:ficheId/:key` | public | lecture des médias (supporte les requêtes Range) |
| `PATCH /api/fiches/:id` | propriétaire / admin | même sauvegarde qu'avant, plus nettoyage des médias retirés |

Les fiches renvoient aussi `planCapabilities` (droits réels de la formule) et des URL de média absolues.

## Nouveaux fichiers (rien d'existant réécrit)
- `modules/client/*` : tableau de bord client
- `modules/subscriptions/` : `subscriptions.client.service.ts`, `subscription.controller.ts`, `subscription.routes.ts`, `subscription.type.ts`
- `modules/fiches/` : `fiches.client.routes.ts` / `.controller.ts` / `.schemas.ts`, `fiches.media.service.ts`, `fiches.media-references.ts`, `passages.service.ts`, `rappels.service.ts`, `plan-capabilities.ts` (+ tests)
- `modules/media/*`, `infrastructure/storage/*`, `config/s3.ts`
- `middlewares/optionalAuth.ts`, `lib/apiResponse.ts`, `lib/logger.ts` (journal sur console, sans winston), `types/user.ts`
- migration `20261017100000_client_features`

## Fichiers existants touchés (petits ajouts)
| Fichier | Changement |
|---|---|
| `app.ts` | 5 imports + 4 montages de routes (le routeur client des fiches est monté AVANT `fichesRouter`) |
| `server.ts` | tâche quotidienne de nettoyage des médias orphelins (seulement si S3 configuré) |
| `config/env.ts` | variables S3_* et FFMPEG_PATH, facultatives |
| `schema.prisma` | enums et modèles Payment, FichePassage, DemandeRappel + 5 relations |
| `fiches.dto.ts` | `mediaUrl()` (URL absolues) et `planCapabilities` |
| `package.json` | dépendance `@aws-sdk/client-s3`, script `test` |
| `.env.example` | variables S3 et FFmpeg |

## Pas repris volontairement
- winston + journal des requêtes (`logger.ts` léger à la place, même interface) ;
- l'ancien `GET /api/subscription/filter` renvoyait toujours la formule Essentielle quel que soit le paramètre : il respecte maintenant `?plan=`.
