import { createHash, createHmac, randomUUID } from "node:crypto";
import { Router } from "express";
import express from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/asyncHandler";
import { HttpError, forbidden, unprocessable } from "../../lib/httpError";
import { requireAuth } from "../../middlewares/auth";
import { FicheService } from "../fiches/fiches.service";

export const mediaRouter = Router();

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};
const sha256 = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");
const hmac = (key: Buffer | string, value: string) =>
  createHmac("sha256", key).update(value).digest();
const amzDate = (date: Date) =>
  date.toISOString().replace(/[:-]|\.\d{3}/g, "");
const encodePath = (value: string) =>
  value.split("/").map(part => encodeURIComponent(part).replace(/[!'()*]/g, c =>
    "%" + c.charCodeAt(0).toString(16).toUpperCase()
  )).join("/");

async function putObject(key: string, body: Buffer, contentType: string) {
  const { S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_REGION } = env;
  if (!S3_ENDPOINT || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
    throw new HttpError(
      503,
      "STOCKAGE_NON_CONFIGURE",
      "Le stockage des médias n'est pas configuré sur le serveur"
    );
  }

  const endpoint = new URL(S3_ENDPOINT);
  const path = `${endpoint.pathname.replace(/\/$/, "")}/${encodePath(S3_BUCKET)}/${encodePath(key)}`;
  const url = new URL(path, endpoint.origin);
  const now = new Date();
  const date = amzDate(now);
  const dateStamp = date.slice(0, 8);
  const payloadHash = sha256(body);
  const headers: Record<string, string> = {
    "content-type": contentType,
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": date,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(name => `${name}:${headers[name].trim()}\n`)
    .join("")
    .trimEnd();
  const canonicalRequest = [
    "PUT",
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${S3_REGION}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    date,
    scope,
    sha256(canonicalRequest),
  ].join("\n");
  const kDate = hmac(`AWS4${S3_SECRET_KEY}`, dateStamp);
  const kRegion = hmac(kDate, S3_REGION);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign)
    .digest("hex");
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${S3_ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: { ...headers, Authorization: authorization },
    body: new Uint8Array(body),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new HttpError(
      502,
      "ECHEC_STOCKAGE",
      `Le stockage a refusé le fichier (HTTP ${response.status})${detail ? `: ${detail}` : ""}`
    );
  }

  const publicBase = (env.S3_PUBLIC_URL || S3_ENDPOINT).replace(/\/$/, "");
  return `${publicBase}/${encodePath(S3_BUCKET)}/${encodePath(key)}`;
}

// Upload binaire direct (pas de base64), limité à une fiche appartenant au compte connecté.
mediaRouter.post(
  "/fiches/:id/upload",
  requireAuth,
  express.raw({ type: () => true, limit: `${env.S3_MAX_UPLOAD_MB}mb` }),
  asyncHandler(async (req, res) => {
    const ficheId = Number(req.params.id);
    if (!Number.isInteger(ficheId) || ficheId <= 0)
      throw unprocessable("ID_INVALIDE", "Identifiant de fiche invalide");

    const fiche = await FicheService.getFiche(req.user!, ficheId);
    if (fiche.statut === "suspendue")
      throw forbidden("FICHE_SUSPENDUE", "Cette fiche est suspendue");
    if (fiche.expiree)
      throw forbidden("ABONNEMENT_EXPIRE", "L'abonnement de cette fiche a expiré");

    const contentType = String(req.headers["content-type"] || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const extension = MIME_EXT[contentType];
    if (!extension)
      throw unprocessable(
        "TYPE_MEDIA_INVALIDE",
        "Formats acceptés : JPEG, PNG, WebP, GIF, MP4 et WebM"
      );
    if (!Buffer.isBuffer(req.body) || req.body.length === 0)
      throw unprocessable("FICHIER_VIDE", "Le fichier envoyé est vide");

    const maxBytes = env.S3_MAX_UPLOAD_MB * 1024 * 1024;
    if (req.body.length > maxBytes)
      throw new HttpError(413, "FICHIER_TROP_VOLUMINEUX", `Taille maximale : ${env.S3_MAX_UPLOAD_MB} Mo`);

    const key = `fiches/${ficheId}/${randomUUID()}.${extension}`;
    const url = await putObject(key, req.body, contentType);
    res.status(201).json({
      media: { url, type: contentType.startsWith("video/") ? "video" : "image" },
    });
  })
);
