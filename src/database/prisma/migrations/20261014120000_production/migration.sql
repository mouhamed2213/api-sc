-- CreateEnum
CREATE TYPE "PrintStatus" AS ENUM ('A_IMPRIMER', 'IMPRIMEE', 'ENCODEE', 'TESTEE', 'LIVREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StickerKind" AS ENUM ('FONCTION', 'TELEPHONE');

-- CreateEnum
CREATE TYPE "StickerFonction" AS ENUM ('AVIS', 'WIFI', 'MENU', 'RESEAUX', 'CONTACT', 'RDV', 'LIEN');

-- CreateEnum
CREATE TYPE "StickerStatus" AS ENUM ('A_PARAMETRER', 'PARAMETRE', 'TESTE', 'IMPRIME', 'LIVRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "QrMode" AS ENUM ('DYNAMIQUE', 'WIFI', 'FICHE');

-- DropIndex
DROP INDEX "sticker_orders_ficheId_idx";

-- AlterTable
ALTER TABLE "print_jobs" ADD COLUMN     "tier" "PlanType",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "formule" DROP NOT NULL,
ALTER COLUMN "slug" DROP NOT NULL,
DROP COLUMN "statut",
ADD COLUMN     "statut" "PrintStatus" NOT NULL DEFAULT 'A_IMPRIMER';

-- AlterTable
ALTER TABLE "qr_links" DROP COLUMN "active",
ADD COLUMN     "actif" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "sticker_orders" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "kind",
ADD COLUMN     "kind" "StickerKind" NOT NULL,
DROP COLUMN "fonction",
ADD COLUMN     "fonction" "StickerFonction",
DROP COLUMN "qrMode",
ADD COLUMN     "qrMode" "QrMode" NOT NULL,
DROP COLUMN "statut",
ADD COLUMN     "statut" "StickerStatus" NOT NULL DEFAULT 'A_PARAMETRER';

-- CreateIndex
CREATE INDEX "print_jobs_statut_createdAt_idx" ON "print_jobs"("statut", "createdAt");

-- CreateIndex
CREATE INDEX "qr_links_stickerId_idx" ON "qr_links"("stickerId");

-- CreateIndex
CREATE INDEX "sticker_orders_kind_statut_createdAt_idx" ON "sticker_orders"("kind", "statut", "createdAt");