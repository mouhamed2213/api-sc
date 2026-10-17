import { Router, raw } from "express";
import { optionalAuth } from "../../middlewares/optionalAuth";
import { requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { FicheClientController } from "./fiches.client.controller";
import {
  createRappelSchema,
  passageStatsQuerySchema,
  rappelListQuerySchema,
  recordPassageSchema,
} from "./fiches.client.schemas";
import { idParam, slugParam, updateFicheSchema } from "./fiches.schemas";

// Monté sur /api/fiches AVANT fichesRouter (voir app.ts) : même principe qu'un groupe de routes
// Laravel déclaré avant un autre. Les routes ci-dessous sont les fonctions côté client ajoutées ;
// tout ce qui ne correspond pas à l'une d'elles continue vers fichesRouter, inchangé.
// ⚠️ Pas de router.use(requireAuth) ici : cela bloquerait les routes publiques de fichesRouter.
export const fichesClientRouter = Router();

// Public — enregistre une ouverture réelle avec une clé d'idempotence par chargement.
fichesClientRouter.post(
  "/public/:slug/passages",
  optionalAuth,
  validate({ params: slugParam, body: recordPassageSchema }),
  FicheClientController.recordPublicPassage
);

// Public — demande de rappel laissée par un visiteur.
fichesClientRouter.post(
  "/public/:slug/rappels",
  validate({ params: slugParam, body: createRappelSchema }),
  FicheClientController.createPublicRappel
);

// Connecté — toutes les demandes de rappel du client (déclarée avant « /:id »).
fichesClientRouter.get(
  "/rappels",
  requireAuth,
  validate({ query: rappelListQuerySchema }),
  FicheClientController.listAllRappels
);

// Connecté — upload binaire (pas de JSON/base64) d'un média de la fiche.
fichesClientRouter.post(
  "/:id/media",
  requireAuth,
  validate({ params: idParam }),
  raw({ type: () => true, limit: "30mb" }),
  FicheClientController.uploadMedia
);

fichesClientRouter.get(
  "/:id/stats",
  requireAuth,
  validate({ params: idParam, query: passageStatsQuerySchema }),
  FicheClientController.getPassageStats
);

fichesClientRouter.get(
  "/:id/rappels",
  requireAuth,
  validate({ params: idParam }),
  FicheClientController.listRappels
);

// Connecté — sauvegarde de la fiche, avec nettoyage des médias retirés.
fichesClientRouter.patch(
  "/:id",
  requireAuth,
  validate({ params: idParam, body: updateFicheSchema }),
  FicheClientController.updateFiche
);
