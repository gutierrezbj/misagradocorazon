-- AlterTable
ALTER TABLE "cause" ADD COLUMN     "fundsUseEn" TEXT,
ADD COLUMN     "fundsUseEs" TEXT;

-- CreateTable
CREATE TABLE "cause_budget_item" (
    "id" TEXT NOT NULL,
    "causeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "conceptEs" TEXT NOT NULL,
    "conceptEn" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,

    CONSTRAINT "cause_budget_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cause_budget_item_causeId_position_key" ON "cause_budget_item"("causeId", "position");

-- AddForeignKey
ALTER TABLE "cause_budget_item" ADD CONSTRAINT "cause_budget_item_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "cause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Causas ya creadas: su presupuesto pasa a ser una única partida, para que el total siga siendo
-- siempre la suma de las partidas.
INSERT INTO "cause_budget_item" ("id", "causeId", "position", "conceptEs", "conceptEn", "amountCents")
SELECT gen_random_uuid()::text, "id", 0, 'Presupuesto total', 'Total budget', "budgetCents" FROM "cause";
