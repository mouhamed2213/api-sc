# Médias des fiches

## Organisation

- `src/modules/media/media.routes.ts` : routes publiques de lecture des médias.
- `src/modules/media/media.controller.ts` : adaptation HTTP, upload binaire et streaming.
- `src/modules/media/media.validation.ts` : formats autorisés, signatures, limites et extraction des références.
- `src/modules/media/media.processor.ts` : optimisation image/vidéo via FFmpeg.
- `src/modules/media/media.service.ts` : droits, formule, stockage et URL de média.
- `src/infrastructure/storage/storage.interface.ts` : contrat fournisseur indépendant.
- `src/infrastructure/storage/s3.storage.ts` : adaptateur S3 compatible (SeaweedFS et stockage S3-compatible).

## Stockage local et migration future

Le code utilise l'API S3. SeaweedFS peut être utilisé avec son endpoint S3. Supabase Storage propose également une API S3-compatible : on peut migrer en changeant l'endpoint, les identifiants et le bucket, sans changer le format des données de fiche.

Les champs persistés contiennent des références relatives de la forme `/api/media/{ficheId}/{uuid}.{extension}`, pas des URL de fournisseur. L'API transforme ces références en URL d'affichage au moment de lire la fiche.

Variables de configuration utilisées :

- `S3_ENDPOINT` : endpoint S3 de SeaweedFS ou de Supabase.
- `S3_ACCESS_KEY_ID` et `S3_SECRET_ACCESS_KEY` : identifiants du stockage.
- `S3_REGION` : région attendue par le service S3.
- `S3_BUCKET` : bucket utilisé.
- `FFMPEG_PATH` : chemin du binaire FFmpeg, par défaut `ffmpeg`.

## Dépendance d'optimisation

Le serveur doit avoir FFmpeg installé et accessible via `PATH`, ou configuré avec `FFMPEG_PATH`. Les images sont réencodées en WebP, dimension maximale 1920 px, qualité 82. Les vidéos sont réencodées en MP4/H.264, dimension maximale 1920 px, CRF 28, audio AAC. Si le résultat est plus volumineux que l'original, le serveur conserve l'original.

L'upload échoue avec `MEDIA_PROCESSOR_UNAVAILABLE` si FFmpeg n'est pas disponible : le serveur ne stocke pas silencieusement un fichier non optimisé.

## Nettoyage

Après une mise à jour réussie de la fiche, les objets média qui étaient référencés avant mais ne le sont plus sont supprimés du stockage. Si le nettoyage échoue, l'erreur est journalisée sans annuler la sauvegarde de la fiche.

Les uploads qui n'ont jamais été enregistrés dans une fiche (par exemple si l'utilisateur ferme l'éditeur avant d'enregistrer) ne sont pas encore récupérés automatiquement. Un job périodique de nettoyage des uploads orphelins reste à prévoir.

## Tests

Les tests unitaires de `media.validation.ts` couvrent les formats MIME, les signatures, les limites de taille et l'extraction des références. Exécuter `npm test`, puis `npm run typecheck` et `npm run build` dans l'environnement backend. Le pipeline réel doit aussi être testé avec SeaweedFS et FFmpeg installés.
