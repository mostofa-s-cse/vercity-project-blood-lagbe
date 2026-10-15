-- AlterTable: set when the donor says "this donation was not me", so the requester can see it was disputed.
ALTER TABLE "request_responses" ADD COLUMN "donation_rejected" BOOLEAN NOT NULL DEFAULT false;
