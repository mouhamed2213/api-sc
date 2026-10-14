import { responseSuccess } from "../../lib/apiResponse";
import { asyncHandler } from "../../lib/asyncHandler";
import { filter, subscriptionKpi } from "./subscriptions.service";

export const SubscriptionController = {
  subscriptionKpi: asyncHandler(async (req, res) => {
    const kpi = await subscriptionKpi();
    responseSuccess(res, { kpi }, 200);
  }),

  filter: asyncHandler(async (req, res) => {
    const { plan } = req.query;

    const result = await filter(plan as string);
    console.log(result);
    return;
    responseSuccess(res, result, 200);
  }),
};
