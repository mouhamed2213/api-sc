import type { NextFunction, Request, Response } from "express";
import type { Role } from "../database/prisma/generated/prisma/client";
import { prisma } from "../database/prisma/prisma-client";
import { forbidden, unauthorized } from "../lib/httpError";
import { verifyToken } from "../lib/jwt";

// Exige un « Authorization: Bearer <token> » valide et recharge l'utilisateur en base
// (un compte supprimé ou rétrogradé perd ses droits immédiatement).
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw unauthorized();

    let userId: number;
    try {
      userId = Number(verifyToken(header.slice(7)).sub);
    } catch {
      throw unauthorized("Session invalide ou expirée");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized("Compte introuvable");

    req.user = {
      id: user.id,
      role: user.role,
      emailVerified: user.emailVerifiedAt !== null,
    };
    next();
  } catch (e) {
    next(e);
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role))
      return next(forbidden("ACCES_REFUSE", "Droits insuffisants"));
    next();
  };
