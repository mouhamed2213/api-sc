import type { PlanType } from "../../database/prisma/generated/prisma/client";
import { responseSuccess } from "../../lib/apiResponse";
import { asyncHandler } from "../../lib/asyncHandler";
import { filter, subscriptionKpi, upgrade } from "./subscriptions.service";

export const SubscriptionController = {
  subscriptionKpi: asyncHandler(async (req, res) => {
    const kpi = await subscriptionKpi(req.user!);
    responseSuccess(
      res,
      {
        nbrFiche: kpi.nbrFiche,
        nbrFicheActive: kpi.nbrFicheActive,
        nbrPayingFiche: kpi.nbrPayingFiche,
      },
      200
    );
  }),

  upgradePlan: asyncHandler(async (req, res) => {
    const { ficheId, plan } = req.body as {
      ficheId: number;
      plan: "pro" | "signature";
    };
    const result = await upgrade(
      req.user!,
      ficheId,
      plan.toUpperCase() as PlanType
    );
    responseSuccess(
      res,
      result,
      200,
      "Formule mise à niveau (paiement simulé)"
    );
  }),

  filter: asyncHandler(async (req, res) => {
    const { plan } = req.query;

    const result = await filter(plan as string);
    responseSuccess(res, result, 200);
  }),
};
