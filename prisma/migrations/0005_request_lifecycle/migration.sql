-- Blood requests get a real life (pending, donor found, completed, cancelled), people can answer them,
-- and the person who made one without an account can manage it with a one-time token.

-- The status enum changes: ACTIVE becomes PENDING, FULFILLED becomes COMPLETED.
CREATE TYPE "request_status" AS ENUM ('PENDING', 'DONOR_FOUND', 'COMPLETED', 'CANCELLED');

ALTER TABLE "sos_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "sos_requests"
  ALTER COLUMN "status" TYPE "request_status"
  USING (CASE "status"::text
    WHEN 'ACTIVE' THEN 'PENDING'
    WHEN 'FULFILLED' THEN 'COMPLETED'
    ELSE 'CANCELLED'
  END)::"request_status";
ALTER TABLE "sos_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "sos_status";

-- New request fields.
ALTER TABLE "sos_requests"
  ADD COLUMN "patient_name" TEXT,
  ADD COLUMN "patient_age" INTEGER,
  ADD COLUMN "attendant_name" TEXT,
  ADD COLUMN "manage_token_hash" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "completed_at" TIMESTAMP(3);

-- Requests that were already fulfilled get their completion time from the last change we know of.
UPDATE "sos_requests" SET "completed_at" = "created_at" WHERE "status" = 'COMPLETED';

-- CreateTable
CREATE TABLE "request_responses" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "donor_id" TEXT,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "request_responses_request_id_phone_key" ON "request_responses"("request_id", "phone");

-- CreateIndex
CREATE INDEX "request_responses_donor_id_idx" ON "request_responses"("donor_id");

-- CreateIndex
CREATE INDEX "sos_requests_is_critical_status_created_at_idx" ON "sos_requests"("is_critical", "status", "created_at");

-- CreateIndex
CREATE INDEX "donors_is_available_created_at_idx" ON "donors"("is_available", "created_at");

-- AddForeignKey
ALTER TABLE "request_responses" ADD CONSTRAINT "request_responses_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "sos_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_responses" ADD CONSTRAINT "request_responses_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same as the earlier migrations: only the server (Prisma) may touch this table, never the browser key.
ALTER TABLE "request_responses" ENABLE ROW LEVEL SECURITY;
