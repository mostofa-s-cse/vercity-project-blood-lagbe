-- CreateTable
CREATE TABLE "emergency_alerts" (
    "id" TEXT NOT NULL,
    "hospital" TEXT NOT NULL,
    "bed" TEXT NOT NULL,
    "blood_group" TEXT NOT NULL,
    "bags" INTEGER NOT NULL,
    "urgency" TEXT NOT NULL,
    "custom_message_bn" TEXT,
    "custom_message_en" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "emergency_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "emergency_alerts_created_at_idx" ON "emergency_alerts"("created_at");

-- Same as every other table here: only the server (Prisma) may touch this, never the browser key.
ALTER TABLE "emergency_alerts" ENABLE ROW LEVEL SECURITY;
