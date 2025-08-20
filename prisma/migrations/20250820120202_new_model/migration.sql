/*
  Warnings:

  - You are about to drop the `MedicalHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."RecordType" AS ENUM ('HISTORY', 'ALLERGY');

-- CreateEnum
CREATE TYPE "public"."AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- DropForeignKey
ALTER TABLE "public"."MedicalHistory" DROP CONSTRAINT "MedicalHistory_patientId_fkey";

-- DropTable
DROP TABLE "public"."MedicalHistory";

-- DropEnum
DROP TYPE "public"."HistoryType";

-- CreateTable
CREATE TABLE "public"."MedicalRecord" (
    "id" TEXT NOT NULL,
    "type" "public"."RecordType" NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "diagnosedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "severity" "public"."AllergySeverity",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT NOT NULL,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."MedicalRecord" ADD CONSTRAINT "MedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
