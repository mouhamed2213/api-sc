import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { AuthController } from "./auth.controller";
import {
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from "./auth.schemas";

export const authRouter = Router();

authRouter.post(
  "/register",
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    AuthController.register;
  })
);

authRouter.post(
  "/login",
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    AuthController.login;
  })
);

authRouter.post(
  "/verify-email",
  validate({ body: tokenSchema }),
  AuthController.verifyEmail
);

authRouter.post(
  "/resend-verification",
  requireAuth,
  AuthController.resendVerificationEmail
);

authRouter.post(
  "/forgot-password",
  validate({ body: emailOnlySchema }),
  AuthController.forgotPassword
);

authRouter.post("/reset-password", validate({ body: resetPasswordSchema }));

authRouter.get("/me", requireAuth, AuthController.me);
