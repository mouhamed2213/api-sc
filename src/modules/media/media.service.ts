import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { prisma } from "../../database/prisma/prisma-client";
import { forbidden, notFound, unprocessable } from "../../lib/httpError";
import type { AuthUser } from "../../types/user";
import { getEffectiveSubscription } from "../subscriptions/subscriptions.service";
import { S3StorageProvider } from "../../infrastructure/storage/s3.storage";

let storage: S3StorageProvider | undefined;
const getStorage = () => (storage ??= new S3StorageProvider());

import {
  MEDIA_FORMATS,
  mediaMaxBytes,
  resolveMediaMime,
  validateMediaSignature,
} from "./media.validation";

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

    const mime = resolveMediaMime(rawMime);
    const { kind, extension } = MEDIA_FORMATS[mime];
    const maxBytes = mediaMaxBytes(kind);
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

    validateMediaSignature(body, mime);
    const fileName = `${randomUUID()}.${extension}`;
    const storageKey = `fiches/${ficheId}/${fileName}`;
    await getStorage().put({ key: storageKey, body, contentType: mime });

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
    const object = await getStorage().get(`fiches/${ficheId}/${fileName}`);
    return { ...object, contentType: object.contentType ?? contentType };
  },

  /** Supprime un objet déjà détaché des données persistées de la fiche. */
  async deleteStoredMedia(ficheId: number, fileName: string) {
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$/i.test(fileName)) return;
    await getStorage().delete(`fiches/${ficheId}/${fileName}`);
  },

};
