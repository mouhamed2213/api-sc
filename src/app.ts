import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { adminRouter } from "./modules/admin/admin.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { fichesRouter } from "./modules/fiches/fiches.routes";
import { fichesClientRouter } from "./modules/fiches/fiches.client.routes";
import clientRoute from "./modules/client/client.route";
import { mediaRouter } from "./modules/media/media.routes";
import subscriptionRoute from "./modules/subscriptions/subscription.routes";
import { plansRouter } from "./modules/plans/plans.routes";
import { parametresRouter } from "./modules/parametres/parametres.routes";
import { scansRouter } from "./modules/scans/scans.routes";
import { relancesRouter } from "./modules/relances/relances.routes";
import { revenusRouter } from "./modules/revenus/revenus.routes";
import { productionRouter, qrPublicRouter } from "./modules/production/production.routes";

export const app = express();

app.set("trust proxy", 1); // derrière Nginx : indispensable pour que le rate limit voie la vraie IP
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map(o => o.trim()) }));
app.use(express.json({ limit: "1mb" }));

// Redirection publique des QR dynamiques (les stickers imprimés pointent ici).
app.use("/q", qrPublicRouter);

// Limite globale + limite stricte sur l'authentification (anti brute-force).
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60_000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/plans", plansRouter);
app.use("/api/media", mediaRouter); // lecture publique des photos/vidéos des fiches
// Fonctions client (passages, rappels, stats, upload, sauvegarde avec médias) : AVANT fichesRouter.
app.use("/api/fiches", fichesClientRouter);
app.use("/api/fiches", fichesRouter);
app.use("/api/subscription", subscriptionRoute); // KPI, changement de formule, paiement simulé
app.use("/api/client", clientRoute); // tableau de bord client
app.use("/api/scans", scansRouter); // route publique : pas de connexion

// Routes admin spécialisées : avant app.use("/api/admin", adminRouter)
app.use("/api/admin/parametres", parametresRouter);
app.use("/api/admin/relances", relancesRouter);
app.use("/api/admin/revenus", revenusRouter);
app.use("/api/admin/production", productionRouter);
app.use("/api/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);