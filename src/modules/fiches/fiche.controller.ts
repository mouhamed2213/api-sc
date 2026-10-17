import { asyncHandler } from "../../lib/asyncHandler";
import { FicheService } from "./fiches.service";

export const FicheController = {
  getPublicFiche: asyncHandler(async (req, res) => {
    res.json({
      fiche: await FicheService.getPublicFiche(String(req.params.slug)),
    });
  }),

  listFiches: asyncHandler(async (req, res) => {
    res.json({ fiches: await FicheService.listFiches(req.user!) });
  }),

  createFiche: asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({ fiche: await FicheService.createFiche(req.user!, req.body) });
  }),

  getFiche: asyncHandler(async (req, res) => {
    res.json({
      fiche: await FicheService.getFiche(req.user!, Number(req.params.id)),
    });
  }),

  updateFiche: asyncHandler(async (req, res) => {
    res.json({
      fiche: await FicheService.updateFiche(
        req.user!,
        Number(req.params.id),
        req.body
      ),
    });
  }),
};
