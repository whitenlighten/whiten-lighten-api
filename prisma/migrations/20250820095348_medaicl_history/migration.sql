/*
  Warnings:

  - You are about to drop the column `allergies` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `dentalHistory` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `medicalHistory` on the `Patient` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[preRegistrationId]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."HistoryType" AS ENUM ('CONDITION', 'ALLERGY', 'SURGERY', 'MEDICATION', 'DENTAL');

-- AlterTable
ALTER TABLE "public"."Patient" DROP COLUMN "allergies",
DROP COLUMN "dentalHistory",
DROP COLUMN "medicalHistory",
ADD COLUMN     "preRegistrationId" TEXT;

-- CreateTable
CREATE TABLE "public"."pre_registrations" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MedicalHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "public"."HistoryType" NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pre_registrations_email_key" ON "public"."pre_registrations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_preRegistrationId_key" ON "public"."Patient"("preRegistrationId");

-- AddForeignKey
ALTER TABLE "public"."Patient" ADD CONSTRAINT "Patient_preRegistrationId_fkey" FOREIGN KEY ("preRegistrationId") REFERENCES "public"."pre_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicalHistory" ADD CONSTRAINT "MedicalHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
