-- CreateTable
CREATE TABLE "public"."AestheticProcedure" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cost" DOUBLE PRECISION,
    "scheduledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AestheticProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AestheticConsent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AestheticConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AestheticAddon" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AestheticAddon_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."AestheticProcedure" ADD CONSTRAINT "AestheticProcedure_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AestheticProcedure" ADD CONSTRAINT "AestheticProcedure_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AestheticConsent" ADD CONSTRAINT "AestheticConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AestheticConsent" ADD CONSTRAINT "AestheticConsent_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AestheticAddon" ADD CONSTRAINT "AestheticAddon_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "public"."AestheticProcedure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
