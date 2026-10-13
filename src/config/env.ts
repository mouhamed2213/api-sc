import "dotenv/config";
import { z } from "zod";
import { logger } from "../lib/logger";

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

  MAILTRAP_API_TOKEN: z.string().min(1, "MAILTRAP_API_TOKEN est requis"),
  SERVER: z.string().default("http://localhost:4000/api"),

  // Stockage S3-compatible : SeaweedFS en local, Supabase Storage en production.
  // Les secrets restent exclusivement dans le fichier .env, jamais dans Git.
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().min(1).default("support-connecte-media"),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_PUBLIC_URL: z.string().url().optional(),
  S3_MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(25).default(10),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  logger.error("Invalid environment configuration", {
    fieldErrors: parsed.error.flatten().fieldErrors,
  });
  process.exit(1);
}

export const env = parsed.data;
