-- AlterTable
ALTER TABLE "donors" ADD COLUMN "last_donation_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "donor_id" TEXT NOT NULL,
    "request_id" TEXT,
    "hospital" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "donated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_by" TEXT,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "donations_donor_id_donated_at_idx" ON "donations"("donor_id", "donated_at");

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "sos_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same as every other table here: only the server (Prisma) may touch this, never the browser key.
ALTER TABLE "donations" ENABLE ROW LEVEL SECURITY;
