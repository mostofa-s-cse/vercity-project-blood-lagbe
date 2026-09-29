-- CreateEnum
CREATE TYPE "app_role" AS ENUM ('ADMIN', 'HOSPITAL');

-- CreateTable
CREATE TABLE "role_grants" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "app_role" NOT NULL,
    "hospital_id" TEXT,
    "granted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "role_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_stock" (
    "hospital_id" TEXT NOT NULL,
    "blood_group" "blood_group" NOT NULL,
    "units" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "hospital_stock_pkey" PRIMARY KEY ("hospital_id","blood_group")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_grants_email_key" ON "role_grants"("email");


-- Same as 0002: only the server (Prisma) may touch these tables, never the browser key.
ALTER TABLE "role_grants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hospital_stock" ENABLE ROW LEVEL SECURITY;
