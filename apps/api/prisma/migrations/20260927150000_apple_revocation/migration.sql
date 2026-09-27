-- CreateTable
CREATE TABLE "apple_revocation" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apple_revocation_pkey" PRIMARY KEY ("id")
);
