CREATE TYPE "FichePassageSource" AS ENUM ('QR', 'NFC', 'DIRECT');

CREATE TABLE "fiche_passages" (
    "id" SERIAL NOT NULL,
    "ficheId" INTEGER NOT NULL,
    "source" "FichePassageSource" NOT NULL,
    "idempotencyKey" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiche_passages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fiche_passages_idempotencyKey_key"
    ON "fiche_passages"("idempotencyKey");

CREATE INDEX "fiche_passages_ficheId_createdAt_idx"
    ON "fiche_passages"("ficheId", "createdAt");

CREATE INDEX "fiche_passages_ficheId_source_createdAt_idx"
    ON "fiche_passages"("ficheId", "source", "createdAt");

ALTER TABLE "fiche_passages"
    ADD CONSTRAINT "fiche_passages_ficheId_fkey"
    FOREIGN KEY ("ficheId") REFERENCES "fiches"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
