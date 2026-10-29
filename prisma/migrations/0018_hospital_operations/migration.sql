-- CreateTable
CREATE TABLE "camps" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "organizer" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time_range" TEXT,
    "target_bags" INTEGER NOT NULL DEFAULT 200,
    "registered_by" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisitions" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "patient_name" TEXT NOT NULL,
    "blood_group" "blood_group" NOT NULL,
    "bags" INTEGER NOT NULL,
    "doctor_name" TEXT NOT NULL,
    "bmdc_number" TEXT NOT NULL,
    "ward" TEXT,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "blood_group" "blood_group" NOT NULL,
    "units" INTEGER NOT NULL,
    "expires_at" TEXT NOT NULL,
    "received_by" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "camps_hospital_id_idx" ON "camps"("hospital_id");
CREATE INDEX "requisitions_hospital_id_idx" ON "requisitions"("hospital_id");
CREATE INDEX "stock_batches_hospital_id_idx" ON "stock_batches"("hospital_id");

-- Same as every other table here: only the server (Prisma) may touch these, never the browser key.
ALTER TABLE "camps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "requisitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_batches" ENABLE ROW LEVEL SECURITY;
