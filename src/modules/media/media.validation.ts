import { z } from "zod";
import { unprocessable } from "../../lib/httpError";

export const publicMediaParams = z.object({
  ficheId: z.coerce.number().int().positive(),
  key: z.string().regex(/^[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$/i),
});

export const MEDIA_FORMATS = {
  "image/jpeg": { extension: "jpg", kind: "image" },
  "image/png": { extension: "png", kind: "image" },
  "image/webp": { extension: "webp", kind: "image" },
  "video/mp4": { extension: "mp4", kind: "video" },
  "video/webm": { extension: "webm", kind: "video" },
} as const;

export type SupportedMediaMime = keyof typeof MEDIA_FORMATS;

export function resolveMediaMime(value: string | undefined): SupportedMediaMime {
  const mime = (value ?? "").split(";")[0].trim().toLowerCase();
  if (!(mime in MEDIA_FORMATS)) {
    throw unprocessable(
      "FORMAT_MEDIA_INVALIDE",
      "Formats acceptés : JPEG, PNG, WebP, MP4 et WebM"
    );
  }
  return mime as SupportedMediaMime;
}

export function mediaMaxBytes(kind: "image" | "video") {
  return kind === "image" ? 12 * 1024 * 1024 : 30 * 1024 * 1024;
}

export function validateMediaSignature(body: Buffer, mime: SupportedMediaMime) {
  const valid =
    mime === "image/jpeg"
      ? body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff
      : mime === "image/png"
        ? body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        : mime === "image/webp"
          ? body.length >= 12 && body.toString("ascii", 0, 4) === "RIFF" && body.toString("ascii", 8, 12) === "WEBP"
          : mime === "video/mp4"
            ? body.length >= 12 && body.toString("ascii", 4, 8) === "ftyp"
            : body.length >= 4 && body.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));

  if (!valid) {
    throw unprocessable(
      "CONTENU_MEDIA_INVALIDE",
      "Le contenu du fichier ne correspond pas à son format déclaré"
    );
  }
}

function collectStoredMediaKeys(value: unknown, ficheId: number): Set<string> {
  const keys = new Set<string>();
  const seen = new Set<object>();
  const pattern = /\/api\/media\/(\d+)\/([0-9a-f-]{36}\.(?:jpg|png|webp|mp4|webm))/gi;

  const visit = (current: unknown) => {
    if (typeof current === "string") {
      pattern.lastIndex = 0;
      for (const match of current.matchAll(pattern)) {
        if (Number(match[1]) === ficheId) keys.add(match[2]);
      }
      return;
    }
    if (!current || typeof current !== "object" || seen.has(current)) return;
    seen.add(current);
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    Object.values(current as Record<string, unknown>).forEach(visit);
  };

  visit(value);
  return keys;
}

