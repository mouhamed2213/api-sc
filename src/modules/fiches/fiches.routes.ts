import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { FicheController } from "./fiche.controller";
import {
  createFicheSchema,
  idParam,
  slugParam,
  updateFicheSchema,
} from "./fiches.schemas";
import * as fiches from "./fiches.service";

export const fichesRouter = Router();

// Public — page de la fiche (NFC / QR). Déclarée AVANT les routes protégées.
fichesRouter.get(
  "/public/:slug",
  validate({ params: slugParam }),
  FicheController.getPublicFiche
);

// Tout le reste exige d'être connecté.
fichesRouter.use(requireAuth);

fichesRouter.get("/", FicheController.listFiches);

fichesRouter.post(
  "/",
  validate({ body: createFicheSchema }),
FicheController.createFiche
);

fichesRouter.get(
  "/:id",
  validate({ params: idParam }),
FicheController.getFiche
);

fichesRouter.patch(
  "/:id",
  validate({ params: idParam, body: updateFicheSchema }),
  FicheController.updateFiche
);
