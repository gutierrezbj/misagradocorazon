-- CreateTable
CREATE TABLE "mass_attendance" (
    "massId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mass_attendance_pkey" PRIMARY KEY ("massId","userId")
);

-- CreateTable
CREATE TABLE "kpi_daily" (
    "day" TEXT NOT NULL,
    "newUsers" INTEGER NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "prayers" INTEGER NOT NULL,
    "candles" INTEGER NOT NULL,
    "buyers" INTEGER NOT NULL,
    "revenueCents" INTEGER NOT NULL,
    "impactCents" INTEGER NOT NULL,
    "votes" INTEGER NOT NULL,
    "chatMessages" INTEGER NOT NULL,
    "massAttendees" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_daily_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE INDEX "mass_attendance_userId_idx" ON "mass_attendance"("userId");

-- AddForeignKey
ALTER TABLE "mass_attendance" ADD CONSTRAINT "mass_attendance_massId_fkey" FOREIGN KEY ("massId") REFERENCES "mass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mass_attendance" ADD CONSTRAINT "mass_attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

