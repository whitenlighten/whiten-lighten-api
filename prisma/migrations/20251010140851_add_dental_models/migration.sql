-- CreateTable
CREATE TABLE "public"."DentalChart" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "chartData" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DentalTreatment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "procedure" TEXT NOT NULL,
    "description" TEXT,
    "performedBy" TEXT,
    "cost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DentalRecall" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recallDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalRecall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DentalChart_patientId_idx" ON "public"."DentalChart"("patientId");

-- CreateIndex
CREATE INDEX "DentalTreatment_patientId_idx" ON "public"."DentalTreatment"("patientId");

-- CreateIndex
CREATE INDEX "DentalRecall_patientId_idx" ON "public"."DentalRecall"("patientId");

-- AddForeignKey
ALTER TABLE "public"."DentalChart" ADD CONSTRAINT "DentalChart_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DentalChart" ADD CONSTRAINT "DentalChart_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DentalTreatment" ADD CONSTRAINT "DentalTreatment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DentalTreatment" ADD CONSTRAINT "DentalTreatment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DentalRecall" ADD CONSTRAINT "DentalRecall_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
