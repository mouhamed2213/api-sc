import { Router } from "express";
import { z } from "zod";
import type {
  PlanType,
  StatutFiche,
} from "../../database/prisma/generated/prisma/client";
import { prisma } from "../../database/prisma/prisma-client";
import { asyncHandler } from "../../lib/asyncHandler";
import { notFound } from "../../lib/httpError";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { ficheInclude, toFicheDto } from "../fiches/fiches.dto";
import { idParam } from "../fiches/fiches.schemas";
import {
  activateSubscription,
  getEffectiveSubscription,
} from "../subscriptions/subscriptions.service";

// Tout ce qu'un CLIENT ne peut jamais faire : slug, statut, propriétaire, formule.
export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN"));

const patchFicheSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug invalide (a-z, 0-9, tirets)")
    .min(3)
    .max(60)
    .optional(),
  statut: z.enum(["active", "suspendue"]).optional(),
  userId: z.number().int().positive().nullable().optional(),
});

adminRouter.patch(
  "/fiches/:id",
  validate({ params: idParam, body: patchFicheSchema }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { slug, statut, userId } = req.body as z.infer<
      typeof patchFicheSchema
    >;
    if (
      !(await prisma.fiche.findUnique({ where: { id }, select: { id: true } }))
    )
      throw notFound("Fiche introuvable");

    const fiche = await prisma.fiche.update({
      where: { id },
      data: {
        slug,
        userId,
        statut: statut ? (statut.toUpperCase() as StatutFiche) : undefined,
      },
      include: ficheInclude,
    });
    res.json({ fiche: toFicheDto(fiche, await getEffectiveSubscription(id)) });
  })
);

const subscriptionSchema = z.object({
  plan: z.enum(["essentielle", "pro", "signature"]),
  endsAt: z
    .string()
    .refine(v => !Number.isNaN(Date.parse(v)), "Date invalide")
    .nullable()
    .optional(),
  amountFcfa: z.number().int().min(0).nullable().optional(),
  paymentRef: z.string().max(100).nullable().optional(),
});

// Active une formule pour une fiche (après paiement validé). L'ancien abonnement actif est annulé.
adminRouter.post(
  "/fiches/:id/subscription",
  validate({ params: idParam, body: subscriptionSchema }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const b = req.body as z.infer<typeof subscriptionSchema>;
    if (
      !(await prisma.fiche.findUnique({ where: { id }, select: { id: true } }))
    )
      throw notFound("Fiche introuvable");

    const subscription = await activateSubscription({
      ficheId: id,
      planType: b.plan.toUpperCase() as PlanType,
      endsAt:
        b.endsAt === undefined
          ? undefined
          : b.endsAt === null
            ? null
            : new Date(b.endsAt),
      amountFcfa: b.amountFcfa,
      paymentRef: b.paymentRef,
    });
    res.status(201).json({ subscription });
  })
);
