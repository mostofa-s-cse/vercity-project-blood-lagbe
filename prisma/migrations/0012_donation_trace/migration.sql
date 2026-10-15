-- AlterTable: units of blood a responder gave, set when the requester confirms who donated.
ALTER TABLE "request_responses" ADD COLUMN "donated_units" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: a short traceable code per donation. Older rows get one derived from their id.
ALTER TABLE "donations" ADD COLUMN "code" TEXT;
UPDATE "donations" SET "code" = 'BL-' || upper(substr(md5("id"), 1, 6)) WHERE "code" IS NULL;
ALTER TABLE "donations" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "donations_code_key" ON "donations"("code");
