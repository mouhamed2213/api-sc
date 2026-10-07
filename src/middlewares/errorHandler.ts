import { Prisma } from "../database/prisma/generated/prisma/client";

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { HttpError } from "../lib/httpError";

export function notFoundHandler(_req: Request, res: Response) {
  res
    .status(404)
    .json({
      error: { code: "ROUTE_INTROUVABLE", message: "Route introuvable" },
    });
}

// Format d'erreur unique : { error: { code, message, details? } }
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({
        error: { code: err.code, message: err.message, details: err.details },
      });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "DONNEES_INVALIDES",
        message: "Données invalides",
        details: err.issues.map(i => ({
          champ: i.path.join("."),
          message: i.message,
        })),
      },
    });
  }
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    return res
      .status(409)
      .json({
        error: { code: "DEJA_UTILISE", message: "Cette valeur existe déjà" },
      });
  }
  console.error(err);
  res.status(500).json({
    error: {
      code: "ERREUR_SERVEUR",
      message: env.NODE_ENV === "production" ? "Erreur interne" : String(err),
    },
  });
}
