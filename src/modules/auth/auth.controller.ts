import { prisma } from "../../database/prisma/prisma-client";
import { asyncHandler } from "../../lib/asyncHandler";
import { AuthService as auth, publicUser } from "./auth.service";

export const AuthController = {
  register: asyncHandler(async (req, res) => {
    res.status(201).json(await auth.register(req.body));
  }),

  login: asyncHandler(async (req, res) => {
    res.json(await auth.login(req.body));
  }),
  verifyEmail: asyncHandler(async (req, res) => {
    await auth.verifyEmail(req.body.token);
    res.json({ ok: true });
  }),

  resendVerificationEmail: asyncHandler(async (req, res) => {
    await auth.resendVerification(req.user!.id);
    res.json({ ok: true });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    await auth.forgotPassword(req.body.email);
    res.json({ ok: true }); // toujours la même réponse
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await auth.resetPassword(req.body.token, req.body.password);
    res.json({ ok: true });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
    });
    res.json({ user: publicUser(user) });
  }),
};
