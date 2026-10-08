-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "donor_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'compatible_request',
    "blood_group" "blood_group" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_donor_id_is_read_idx" ON "notifications"("donor_id", "is_read");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "sos_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same as every other table here: only the server (Prisma) may touch this, never the browser key.
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
