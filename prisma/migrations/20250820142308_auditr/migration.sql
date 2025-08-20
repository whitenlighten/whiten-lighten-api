/*
  Warnings:

  - You are about to drop the `pre_registrations` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."PreRegistrationStatus" AS ENUM ('PENDING', 'COMPLETED');

-- AlterEnum
ALTER TYPE "public"."Role" ADD VALUE 'PATIENT';

-- DropForeignKey
ALTER TABLE "public"."Patient" DROP CONSTRAINT "Patient_preRegistrationId_fkey";

-- AlterTable
ALTER TABLE "public"."Patient" ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "emergencyContact" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."pre_registrations";

-- CreateTable
CREATE TABLE "public"."PreRegistration" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT,
    "preRegCode" TEXT NOT NULL,
    "status" "public"."PreRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreRegistration_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "PreRegistration_preRegCode_key" ON "public"."PreRegistration"("preRegCode");

-- AddForeignKey
ALTER TABLE "public"."Patient" ADD CONSTRAINT "Patient_preRegistrationId_fkey" FOREIGN KEY ("preRegistrationId") REFERENCES "public"."PreRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
