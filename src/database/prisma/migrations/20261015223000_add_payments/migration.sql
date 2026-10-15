-- Persist payment attempts separately from the subscription they may activate.
CREATE TYPE "PaymentProvider" AS ENUM ('SIMULATION', 'WAVE', 'ORANGE_MONEY');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

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

CREATE UNIQUE INDEX "payments_providerReference_key" ON "payments"("providerReference");
CREATE INDEX "payments_ficheId_status_createdAt_idx" ON "payments"("ficheId", "status", "createdAt");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_ficheId_fkey"
  FOREIGN KEY ("ficheId") REFERENCES "fiches"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "plans"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
