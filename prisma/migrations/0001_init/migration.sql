-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "blood_group" AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

-- CreateEnum
CREATE TYPE "sos_status" AS ENUM ('ACTIVE', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donors" (
    "id" TEXT NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "blood_group" "blood_group" NOT NULL,
    "area" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "division" TEXT,
    "email" TEXT,
    "weight_kg" INTEGER,
    "last_donation_months" INTEGER,
    "vehicle" TEXT,
    "nearest_hospital" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_requests" (
    "id" TEXT NOT NULL,
    "user_id" UUID,
    "area" TEXT,
    "problem" TEXT,
    "blood_group" "blood_group" NOT NULL,
    "bags" INTEGER NOT NULL DEFAULT 1,
    "place" TEXT NOT NULL,
    "phones" TEXT[],
    "is_critical" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'bn',
    "post_text" TEXT NOT NULL,
    "status" "sos_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sos_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "donors_blood_group_area_idx" ON "donors"("blood_group", "area");

-- CreateIndex
CREATE INDEX "donors_user_id_idx" ON "donors"("user_id");

-- CreateIndex
CREATE INDEX "sos_requests_status_created_at_idx" ON "sos_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "sos_requests_user_id_idx" ON "sos_requests"("user_id");

-- AddForeignKey
ALTER TABLE "donors" ADD CONSTRAINT "donors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_requests" ADD CONSTRAINT "sos_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

