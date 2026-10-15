-- AlterTable: a "your donation was confirmed" notification points at its donation, and goes away with it
-- (a corrected request deletes its donations).
ALTER TABLE "notifications" ADD COLUMN "donation_id" TEXT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
