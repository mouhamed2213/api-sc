import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET doit faire au moins 32 caractères"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  APP_URL: z.string().default("http://localhost:5173"),
  REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .default("false")
    .transform(v => v === "true"),
  MAX_FICHES_PER_USER: z.coerce.number().int().positive().default(3),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Variables d'environnement invalides :",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = parsed.data;
