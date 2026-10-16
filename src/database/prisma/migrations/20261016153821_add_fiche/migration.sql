-- CreateTable
CREATE TABLE "DemandeRappel" (
    "id" SERIAL NOT NULL,
    "ficheId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeRappel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DemandeRappel" ADD CONSTRAINT "DemandeRappel_ficheId_fkey" FOREIGN KEY ("ficheId") REFERENCES "fiches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
