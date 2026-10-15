import { responseSuccess } from "../../lib/apiResponse";
import { asyncHandler } from "../../lib/asyncHandler";
import { filter, subscriptionKpi } from "./subscriptions.service";

export const SubscriptionController = {
  subscriptionKpi: asyncHandler(async (req, res) => {
    const kpi = await subscriptionKpi();
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

  filter: asyncHandler(async (req, res) => {
    const { plan } = req.query;

    const result = await filter(plan as string);
    responseSuccess(res, result, 200);
  }),
};
