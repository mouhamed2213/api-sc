import { asyncHandler } from "../../lib/asyncHandler";
import { FicheService } from "./fiches.service";
import { storeFicheMedia } from "./media.storage";

function decodeFilename(value: string | undefined) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value).slice(0, 160);
  } catch {
    return value.slice(0, 160);
  }
}

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

  uploadMedia: asyncHandler(async (req, res) => {
    const ficheId = Number(req.params.id);
    await FicheService.assertCanModify(req.user!, ficheId);
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const media = await storeFicheMedia(
      ficheId,
      body,
      String(req.headers["content-type"] || ""),
      decodeFilename(req.headers["x-filename"] as string | undefined),
    );
    res.status(201).json({ media });
  }),
};
