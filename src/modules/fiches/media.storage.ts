import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { HttpError } from "../../lib/httpError";

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export const MEDIA_TYPES = new Set(Object.keys(MIME_TO_EXTENSION));

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function safeName(value: string | undefined, mime: string) {
  const extension = MIME_TO_EXTENSION[mime];
  const base = (value || "media")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return `${base || "media"}-${randomUUID()}.${extension}`;
}

export async function storeFicheMedia(
  ficheId: number,
  body: Buffer,
  mime: string,
  originalName?: string
) {
  const normalizedMime = mime.split(";", 1)[0].trim().toLowerCase();
  if (!MEDIA_TYPES.has(normalizedMime)) {
    throw new HttpError(415, "TYPE_MEDIA_INVALIDE", "Format de média non pris en charge");
  }
  if (body.byteLength === 0) {
    throw new HttpError(400, "MEDIA_VIDE", "Le fichier envoyé est vide");
  }
  if (body.byteLength > env.MEDIA_MAX_BYTES) {
    throw new HttpError(413, "MEDIA_TROP_LOURD", "Le fichier est trop volumineux");
  }
  if (!env.SEAWEEDFS_FILER_URL) {
    throw new HttpError(503, "STOCKAGE_NON_CONFIGURE", "Le stockage des médias n'est pas configuré");
  }

  const filename = safeName(originalName, normalizedMime);
  const objectPath = `${env.SEAWEEDFS_MEDIA_COLLECTION}/fiches/${ficheId}/${filename}`;
  const filerUrl = `${trimSlash(env.SEAWEEDFS_FILER_URL)}/${objectPath}`;
  const response = await fetch(filerUrl, {
    method: "PUT",
    headers: {
      "Content-Type": normalizedMime,
      "Content-Length": String(body.byteLength),
    },
    body: new Uint8Array(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new HttpError(502, "STOCKAGE_INDISPONIBLE", `SeaweedFS a refusé le fichier${detail ? ` : ${detail.slice(0, 160)}` : ""}`);
  }

  const publicBase = trimSlash(env.SEAWEEDFS_PUBLIC_URL || env.SEAWEEDFS_FILER_URL);
  return {
    url: `${publicBase}/${objectPath}`,
    type: normalizedMime.startsWith("video/") ? "video" as const : "image" as const,
    alt: "",
    size: body.byteLength,
  };
}
