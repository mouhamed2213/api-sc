import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { SubscriptionController } from "./subsctiption.controller";
const subscriptionRoute = Router();

subscriptionRoute.use(requireAuth);
subscriptionRoute.get("/kpi", SubscriptionController.subscriptionKpi);
subscriptionRoute.get("/filter", SubscriptionController.filter);

export default subscriptionRoute;
