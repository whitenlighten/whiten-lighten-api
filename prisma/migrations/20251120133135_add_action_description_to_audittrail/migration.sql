/*
  Warnings:

  - You are about to drop the column `assignedTo` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `completed` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `dueAt` on the `Task` table. All the data in the column will be lost.
  - Made the column `createdById` on table `Task` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."Task_assignedTo_idx";

-- DropIndex
DROP INDEX "public"."Task_completed_idx";

-- DropIndex
DROP INDEX "public"."Task_createdById_idx";

-- DropIndex
DROP INDEX "public"."Task_dueAt_idx";

-- DropIndex
DROP INDEX "public"."Task_title_idx";

-- AlterTable
ALTER TABLE "public"."AuditTrail" ADD COLUMN     "actionDescription" TEXT,
ADD COLUMN     "after" TEXT,
ADD COLUMN     "before" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "public"."Task" DROP COLUMN "assignedTo",
DROP COLUMN "completed",
DROP COLUMN "dueAt",
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "priority" TEXT,
ADD COLUMN     "related_appointment_id" TEXT,
ADD COLUMN     "related_patient_id" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "createdById" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."_TaskToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TaskToUser_B_index" ON "public"."_TaskToUser"("B");

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_related_patient_id_fkey" FOREIGN KEY ("related_patient_id") REFERENCES "public"."Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_related_appointment_id_fkey" FOREIGN KEY ("related_appointment_id") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TaskToUser" ADD CONSTRAINT "_TaskToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TaskToUser" ADD CONSTRAINT "_TaskToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
