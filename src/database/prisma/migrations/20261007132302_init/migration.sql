-- Production : cartes à imprimer, stickers, QR dynamiques.

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ficheId" INTEGER,
    "formule" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nfcUrl" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'a_imprimer',
    "design" JSONB,
    "rectoPath" TEXT,
    "versoPath" TEXT,
    "clientNom" TEXT,
    "clientEntreprise" TEXT,
    "clientTelephone" TEXT,
    "clientEmail" TEXT,
    "clientFonction" TEXT,
    "printedAt" TIMESTAMP(3),
    "testedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sticker_orders" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ficheId" INTEGER,
    "kind" TEXT NOT NULL,
    "fonction" TEXT,
    "tailleMm" INTEGER NOT NULL,
    "forme" TEXT,
    "theme" TEXT,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "options" JSONB,
    "parametres" JSONB,
    "personnalisation" JSONB,
    "qrMode" TEXT NOT NULL,
    "qrCode" TEXT,
    "ficheSlug" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'a_parametrer',
    "clientNom" TEXT,
    "clientEntreprise" TEXT,
    "clientTelephone" TEXT,
    "clientEmail" TEXT,
    "clientFonction" TEXT,
    "notes" TEXT,

    CONSTRAINT "sticker_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_links" (
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT,
    "targetUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scans" INTEGER NOT NULL DEFAULT 0,
    "lastScanAt" TIMESTAMP(3),
    "stickerId" INTEGER,

    CONSTRAINT "qr_links_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "print_jobs_statut_createdAt_idx" ON "print_jobs"("statut", "createdAt");

-- CreateIndex
CREATE INDEX "print_jobs_ficheId_idx" ON "print_jobs"("ficheId");

-- CreateIndex
CREATE INDEX "sticker_orders_kind_statut_createdAt_idx" ON "sticker_orders"("kind", "statut", "createdAt");

-- CreateIndex
CREATE INDEX "sticker_orders_ficheId_idx" ON "sticker_orders"("ficheId");

-- CreateIndex
CREATE INDEX "sticker_orders_qrCode_idx" ON "sticker_orders"("qrCode");

-- Une seule carte active par adresse de fiche (comme pour subscriptions : index partiel, hors schema.prisma).
-- CREATE UNIQUE INDEX "print_jobs_slug_actif" ON "print_jobs" ("slug") WHERE "statut" <> 'annulee';

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_ficheId_fkey" FOREIGN KEY ("ficheId") REFERENCES "fiches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sticker_orders" ADD CONSTRAINT "sticker_orders_ficheId_fkey" FOREIGN KEY ("ficheId") REFERENCES "fiches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_links" ADD CONSTRAINT "qr_links_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "sticker_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
