/*
  Warnings:

  - You are about to drop the column `patientId` on the `Notification` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_patientId_fkey";

-- AlterTable
ALTER TABLE "public"."Notification" DROP COLUMN "patientId";

-- AlterTable
ALTER TABLE "public"."Patient" ADD COLUMN     "approvedById" TEXT;

-- CreateTable
CREATE TABLE "public"."AuditTrail" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditTrail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "public"."Patient"("userId");

-- AddForeignKey
ALTER TABLE "public"."Patient" ADD CONSTRAINT "Patient_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
