-- Fonctions côté client : paiements, passages (stats d'ouverture) et demandes de rappel.

CREATE TYPE "PaymentProvider" AS ENUM ('SIMULATION', 'WAVE', 'ORANGE_MONEY');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "FichePassageSource" AS ENUM ('QR', 'NFC', 'DIRECT');

CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "ficheId" INTEGER NOT NULL,
    "subscriptionId" INTEGER,
    "planId" INTEGER NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'SIMULATION',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountFcfa" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "providerReference" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fiche_passages" (
    "id" SERIAL NOT NULL,
    "ficheId" INTEGER NOT NULL,
    "source" "FichePassageSource" NOT NULL,
    "idempotencyKey" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiche_passages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DemandeRappel" (
    "id" SERIAL NOT NULL,
    "ficheId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeRappel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_providerReference_key" ON "payments"("providerReference");
CREATE INDEX "payments_ficheId_status_createdAt_idx" ON "payments"("ficheId", "status", "createdAt");
CREATE UNIQUE INDEX "fiche_passages_idempotencyKey_key" ON "fiche_passages"("idempotencyKey");
CREATE INDEX "fiche_passages_ficheId_createdAt_idx" ON "fiche_passages"("ficheId", "createdAt");
CREATE INDEX "fiche_passages_ficheId_source_createdAt_idx" ON "fiche_passages"("ficheId", "source", "createdAt");
CREATE INDEX "DemandeRappel_ficheId_createdAt_idx" ON "DemandeRappel"("ficheId", "createdAt");

ALTER TABLE "payments" ADD CONSTRAINT "payments_ficheId_fkey" FOREIGN KEY ("ficheId") REFERENCES "fiches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiche_passages" ADD CONSTRAINT "fiche_passages_ficheId_fkey" FOREIGN KEY ("ficheId") REFERENCES "fiches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemandeRappel" ADD CONSTRAINT "DemandeRappel_ficheId_fkey" FOREIGN KEY ("ficheId") REFERENCES "fiches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
