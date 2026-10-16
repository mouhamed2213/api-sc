-- Keep the callback-request table available on databases where it has not yet been created.
CREATE TABLE IF NOT EXISTS "DemandeRappel" (
  "id" SERIAL NOT NULL,
  "ficheId" INTEGER NOT NULL,
  "nom" TEXT NOT NULL,
  "telephone" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DemandeRappel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DemandeRappel_ficheId_createdAt_idx"
  ON "DemandeRappel"("ficheId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DemandeRappel_ficheId_fkey'
  ) THEN
    ALTER TABLE "DemandeRappel"
      ADD CONSTRAINT "DemandeRappel_ficheId_fkey"
      FOREIGN KEY ("ficheId") REFERENCES "fiches"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
