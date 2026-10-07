import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { adminRouter } from "./modules/admin/admin.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { fichesRouter } from "./modules/fiches/fiches.routes";
import { plansRouter } from "./modules/plans/plans.routes";

export const app = express();

app.set("trust proxy", 1); // derrière Nginx : indispensable pour que le rate limit voie la vraie IP
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map(o => o.trim()) }));
app.use(express.json({ limit: "1mb" }));

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
app.use("/api/fiches", fichesRouter);
app.use("/api/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);
