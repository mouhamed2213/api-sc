import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { prisma } from "../../database/prisma/prisma-client";
import { forbidden, notFound, unprocessable } from "../../lib/httpError";
import type { AuthUser } from "../../types/user";
import { getEffectiveSubscription } from "../subscriptions/subscriptions.service";
import { S3StorageProvider } from "../../infrastructure/storage/s3.storage";

const storage = new S3StorageProvider();

const MIME = {
  "image/jpeg": { extension: "jpg", kind: "image" },
  "image/png": { extension: "png", kind: "image" },
  "image/webp": { extension: "webp", kind: "image" },
  "video/mp4": { extension: "mp4", kind: "video" },
  "video/webm": { extension: "webm", kind: "video" },
} as const;

type SupportedMime = keyof typeof MIME;

function getMime(value: string | undefined): SupportedMime {
  const mime = (value ?? "").split(";")[0].trim().toLowerCase();
  if (!(mime in MIME)) {
    throw unprocessable("FORMAT_MEDIA_INVALIDE", "Formats acceptés : JPEG, PNG, WebP, MP4 et WebM");
  }
  return mime as SupportedMime;
}

function validateSignature(body: Buffer, mime: SupportedMime) {
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
    throw unprocessable("CONTENU_MEDIA_INVALIDE", "Le contenu du fichier ne correspond pas à son format déclaré");
  }
}

function assertAccess(user: AuthUser, fiche: { userId: number | null }) {
  if (user.role !== "ADMIN" && fiche.userId !== user.id) {
    throw notFound("Fiche introuvable");
  }
}

function publicUrl(ficheId: number, fileName: string) {
  const base = env.SERVER.replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${base}/api/media/${ficheId}/${fileName}`;
}

export const MediaService = {
  async upload(user: AuthUser, ficheId: number, body: Buffer, rawMime?: string) {
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw unprocessable("FICHIER_VIDE", "Le fichier envoyé est vide");
    }

    const fiche = await prisma.fiche.findUnique({
      where: { id: ficheId },
      select: { id: true, userId: true, statut: true },
    });
    if (!fiche) throw notFound("Fiche introuvable");
    assertAccess(user, fiche);
    if (user.role !== "ADMIN" && fiche.statut === "SUSPENDUE") {
      throw forbidden("FICHE_SUSPENDUE", "Cette fiche est suspendue : modification impossible");
    }

    const subscription = await getEffectiveSubscription(ficheId);
    const limits = subscription?.plan.limits;
    if (!limits) {
      throw forbidden("ABONNEMENT_EXPIRE", "Un abonnement actif est nécessaire pour ajouter des médias");
    }

    const mime = getMime(rawMime);
    const { kind, extension } = MIME[mime];
    const maxBytes = kind === "image" ? 12 * 1024 * 1024 : 30 * 1024 * 1024;
    if (body.length > maxBytes) {
      throw unprocessable(
        "MEDIA_TROP_LOURD",
        kind === "image" ? "Une image ne peut pas dépasser 12 Mo" : "Une vidéo ne peut pas dépasser 30 Mo"
      );
    }
    if (kind === "image" && limits.maxPhotos < 1) {
      throw forbidden("FORMULE_SANS_PHOTOS", "Les photos ne sont pas disponibles avec cette formule");
    }
    if (kind === "video" && limits.maxVideos < 1) {
      throw forbidden("FORMULE_SANS_VIDEOS", "Les vidéos ne sont pas disponibles avec cette formule");
    }

    validateSignature(body, mime);
    const fileName = `${randomUUID()}.${extension}`;
    const storageKey = `fiches/${ficheId}/${fileName}`;
    await storage.put({ key: storageKey, body, contentType: mime });

    return {
      url: publicUrl(ficheId, fileName),
      type: kind,
      alt: "",
      size: body.length,
    };
  },

  async getPublic(ficheId: number, fileName: string) {
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$/i.test(fileName)) {
      throw notFound("Média introuvable");
    }
    const fiche = await prisma.fiche.findUnique({
      where: { id: ficheId },
      select: { id: true, statut: true },
    });
    if (!fiche || fiche.statut === "SUSPENDUE") throw notFound("Média introuvable");

    const extension = fileName.split(".").pop()?.toLowerCase();
    const contentType =
      extension === "jpg" ? "image/jpeg" :
      extension === "png" ? "image/png" :
      extension === "webp" ? "image/webp" :
      extension === "mp4" ? "video/mp4" : "video/webm";
    const object = await storage.get(`fiches/${ficheId}/${fileName}`);
    return { ...object, contentType: object.contentType ?? contentType };
  },
};
