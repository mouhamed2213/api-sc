import type { NextFunction, Request, Response } from "express";
import { prisma } from "../database/prisma/prisma-client";
import { verifyToken } from "../lib/jwt";

// Authentification facultative pour les endpoints publics qui doivent distinguer
// un visiteur anonyme du propriétaire connecté. Un jeton absent ou invalide reste anonyme.
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return next();

    try {
      const userId = Number(verifyToken(header.slice(7)).sub);
      if (!Number.isSafeInteger(userId) || userId <= 0) return next();

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        req.user = {
          id: user.id,
          role: user.role,
          emailVerified: user.emailVerifiedAt !== null,
        };
      }
    } catch {
      // L'endpoint reste public : un jeton expiré ne bloque pas la consultation.
    }
    next();
  } catch (error) {
    next(error);
  }
}
