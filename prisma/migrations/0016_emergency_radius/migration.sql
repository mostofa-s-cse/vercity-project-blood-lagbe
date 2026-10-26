-- CreateTable
CREATE TABLE "emergency_radius" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "zone" TEXT NOT NULL,
    "radius_km" INTEGER NOT NULL,
    "request_count" INTEGER NOT NULL,
    "hospitals" TEXT NOT NULL,
    "custom_text_bn" TEXT,
    "custom_text_en" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "emergency_radius_pkey" PRIMARY KEY ("id")
);

-- Same as every other table here: only the server (Prisma) may touch this, never the browser key.
ALTER TABLE "emergency_radius" ENABLE ROW LEVEL SECURITY;
