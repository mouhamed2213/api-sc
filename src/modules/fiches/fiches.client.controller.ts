import { asyncHandler } from "../../lib/asyncHandler";
import { MediaController } from "../media/media.controller";
import { updateFicheWithMedia } from "./fiches.media.service";
import { PassageService, type PassageSource } from "./passages.service";
import { RappelService } from "./rappels.service";

export const FicheClientController = {
  createPublicRappel: asyncHandler(async (req, res) => {
    const result = await RappelService.createPublic(String(req.params.slug), req.body);
    res.status(201).json({ ok: true, demande: result });
  }),

  listAllRappels: asyncHandler(async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    res.json({ rappels: await RappelService.listForUser(req.user!, page, limit) });
  }),

  listRappels: asyncHandler(async (req, res) => {
    res.json({ rappels: await RappelService.listForFiche(req.user!, Number(req.params.id)) });
  }),

  recordPublicPassage: asyncHandler(async (req, res) => {
    const source = String(req.body.source).toUpperCase() as PassageSource;
    const result = await PassageService.record(
      String(req.params.slug),
      source,
      String(req.body.idempotencyKey),
      req.user
    );
    res.status(result.recorded ? 201 : 200).json({ ok: true, ...result });
  }),

  getPassageStats: asyncHandler(async (req, res) => {
    const result = await PassageService.stats(req.user!, Number(req.params.id), {
      granularity: req.query.granularity === "day" ? "day" : "month",
      ...(typeof req.query.date === "string" ? { date: req.query.date } : {}),
      ...(typeof req.query.month === "string" ? { month: req.query.month } : {}),
    });
    res.json({ stats: result });
  }),

  // PATCH /api/fiches/:id avec gestion des médias (remplace la route de fiches.routes.ts, montée avant elle).
  updateFiche: asyncHandler(async (req, res) => {
    res.json({
      fiche: await updateFicheWithMedia(req.user!, Number(req.params.id), req.body),
    });
  }),

  uploadMedia: MediaController.upload,
};
