-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_code" TEXT,
    "type" TEXT NOT NULL,
    "division" TEXT,
    "district" TEXT,
    "address" TEXT,
    "hotline" TEXT,
    "emergency_contact" TEXT,
    "director_name" TEXT,
    "license_number" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_beds" INTEGER,
    "icu_beds" INTEGER,
    "applied_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Same as every other table here: only the server (Prisma) may touch this, never the browser key.
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
