import { z } from "zod";

// Schémas des fonctions côté client ajoutées : passages (stats d'ouverture) et demandes de rappel.
// Fichier séparé : fiches.schemas.ts n'est pas modifié.

const text = (max: number) => z.string().trim().max(max);

export const recordPassageSchema = z.object({
  source: z.enum(["qr", "nfc", "direct"]),
  idempotencyKey: z.string().min(16).max(64).regex(/^[a-zA-Z0-9_-]+$/),
});

export const passageStatsQuerySchema = z
  .object({
    granularity: z.enum(["day", "month"]).default("month"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  })
  .refine(value => !(value.date && value.month), {
    message: "Choisissez une date ou un mois, pas les deux.",
  });

export const createRappelSchema = z.object({
  nom: text(100).min(2, "Le nom doit contenir au moins 2 caractères."),
  telephone: text(30).min(7).max(25),
});

export const rappelListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
