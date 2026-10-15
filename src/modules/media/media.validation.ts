import { z } from "zod";

export const publicMediaParams = z.object({
  ficheId: z.coerce.number().int().positive(),
  key: z.string().regex(/^[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$/i),
});
