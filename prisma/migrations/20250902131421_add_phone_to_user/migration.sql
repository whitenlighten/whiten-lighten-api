/*
  Warnings:

  - The values [APPROVED] on the enum `PatientStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `cancellationReason` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `rescheduledFromId` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `ClinicalNote` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContact` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `isApproved` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `isPartial` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `medicalConditions` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `patientCode` on the `Patient` table. All the data in the column will be lost.
  - The `gender` column on the `Patient` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `hashedToken` on the `RefreshToken` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `RefreshToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[patientId]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `date` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientId` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Made the column `firstName` on table `Patient` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastName` on table `Patient` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `token` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."NoteStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'INSURANCE', 'HMO', 'TRANSFER', 'CARD');

-- CreateEnum
CREATE TYPE "public"."BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');

-- CreateEnum
CREATE TYPE "public"."RegistrationType" AS ENUM ('SELF', 'FRONTDESK', 'ADMIN', 'DOCTOR');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."PatientStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
ALTER TABLE "public"."Patient" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Patient" ALTER COLUMN "status" TYPE "public"."PatientStatus_new" USING ("status"::text::"public"."PatientStatus_new");
ALTER TYPE "public"."PatientStatus" RENAME TO "PatientStatus_old";
ALTER TYPE "public"."PatientStatus_new" RENAME TO "PatientStatus";
DROP TYPE "public"."PatientStatus_old";
ALTER TABLE "public"."Patient" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
ALTER TYPE "public"."Role" ADD VALUE 'PATIENT';

-- DropForeignKey
ALTER TABLE "public"."Appointment" DROP CONSTRAINT "Appointment_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Appointment" DROP CONSTRAINT "Appointment_rescheduledFromId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropIndex
DROP INDEX "public"."Patient_patientCode_key";

-- DropIndex
DROP INDEX "public"."RefreshToken_hashedToken_key";

-- DropIndex
DROP INDEX "public"."RefreshToken_userId_key";

-- AlterTable
ALTER TABLE "public"."Appointment" DROP COLUMN "cancellationReason",
DROP COLUMN "createdById",
DROP COLUMN "rescheduledFromId",
DROP COLUMN "scheduledAt",
DROP COLUMN "source",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "service" TEXT NOT NULL DEFAULT 'General Consultation';

-- AlterTable
ALTER TABLE "public"."ClinicalNote" DROP COLUMN "note",
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "doctorNotes" TEXT,
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "status" "public"."NoteStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "treatmentPlan" TEXT,
ADD COLUMN     "visitId" TEXT;

-- AlterTable
ALTER TABLE "public"."Patient" DROP COLUMN "emergencyContact",
DROP COLUMN "isApproved",
DROP COLUMN "isPartial",
DROP COLUMN "medicalConditions",
DROP COLUMN "patientCode",
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "alternatePhone" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "bloodGroup" "public"."BloodGroup",
ADD COLUMN     "chronicConditions" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'Nigeria',
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "currentMedications" TEXT,
ADD COLUMN     "emergencyName" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "emergencyRelation" TEXT,
ADD COLUMN     "familyHistory" TEXT,
ADD COLUMN     "genotype" TEXT,
ADD COLUMN     "immunizationRecords" TEXT,
ADD COLUMN     "insuranceNumber" TEXT,
ADD COLUMN     "insuranceProvider" TEXT,
ADD COLUMN     "lga" TEXT,
ADD COLUMN     "maritalStatus" "public"."MaritalStatus",
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "pastMedicalHistory" TEXT,
ADD COLUMN     "pastSurgicalHistory" TEXT,
ADD COLUMN     "patientId" TEXT NOT NULL,
ADD COLUMN     "paymentMethod" "public"."PaymentMethod",
ADD COLUMN     "primaryDoctorId" TEXT,
ADD COLUMN     "registeredById" TEXT,
ADD COLUMN     "registrationType" "public"."RegistrationType" NOT NULL DEFAULT 'FRONTDESK',
ADD COLUMN     "religion" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL,
DROP COLUMN "gender",
ADD COLUMN     "gender" "public"."Gender",
ALTER COLUMN "allergies" DROP NOT NULL,
ALTER COLUMN "allergies" DROP DEFAULT,
ALTER COLUMN "allergies" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "public"."RefreshToken" DROP COLUMN "hashedToken",
DROP COLUMN "updatedAt",
ADD COLUMN     "token" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "specialization" TEXT;

-- DropEnum
DROP TYPE "public"."AppointmentSource";

-- CreateTable
CREATE TABLE "public"."Visit" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "notes" TEXT,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PatientCounter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "description" TEXT,
    "reference" TEXT,
    "dueDate" TIMESTAMP(3),
    "metadata" JSONB,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionRef" TEXT,
    "gateway" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NoteSuggestion" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "public"."NoteStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_DoctorApprovedNotes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DoctorApprovedNotes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_NurseCreatedNotes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NurseCreatedNotes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_reference_key" ON "public"."Invoice"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionRef_key" ON "public"."Payment"("transactionRef");

-- CreateIndex
CREATE INDEX "_DoctorApprovedNotes_B_index" ON "public"."_DoctorApprovedNotes"("B");

-- CreateIndex
CREATE INDEX "_NurseCreatedNotes_B_index" ON "public"."_NurseCreatedNotes"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientId_key" ON "public"."Patient"("patientId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- AddForeignKey
ALTER TABLE "public"."Patient" ADD CONSTRAINT "Patient_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClinicalNote" ADD CONSTRAINT "ClinicalNote_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "public"."Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClinicalNote" ADD CONSTRAINT "ClinicalNote_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Visit" ADD CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NoteSuggestion" ADD CONSTRAINT "NoteSuggestion_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NoteSuggestion" ADD CONSTRAINT "NoteSuggestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NoteSuggestion" ADD CONSTRAINT "NoteSuggestion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DoctorApprovedNotes" ADD CONSTRAINT "_DoctorApprovedNotes_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."ClinicalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DoctorApprovedNotes" ADD CONSTRAINT "_DoctorApprovedNotes_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_NurseCreatedNotes" ADD CONSTRAINT "_NurseCreatedNotes_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."NoteSuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_NurseCreatedNotes" ADD CONSTRAINT "_NurseCreatedNotes_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
