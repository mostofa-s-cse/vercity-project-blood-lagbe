-- Which division an SOS request belongs to (the header filter). Nullable: older rows are filled by
-- `npm run db:backfill-division`, and a request whose place/area names no division stays null.
ALTER TABLE "sos_requests" ADD COLUMN "division" TEXT;

CREATE INDEX "sos_requests_division_status_idx" ON "sos_requests"("division", "status");
