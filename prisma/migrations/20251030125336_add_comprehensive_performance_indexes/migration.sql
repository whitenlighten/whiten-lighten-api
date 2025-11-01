/*
  Warnings:

  - You are about to drop the column `issuedAt` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `Payment` table. All the data in the column will be lost.
  - The `status` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `createdById` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `method` on the `Payment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `paidAt` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'GATEWAY';

-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_patientId_fkey";

-- DropIndex
DROP INDEX "public"."User_email_idx";

-- AlterTable
ALTER TABLE "public"."Appointment" ALTER COLUMN "timeslot" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."Invoice" DROP COLUMN "issuedAt",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Payment" DROP COLUMN "createdAt",
DROP COLUMN "patientId",
ADD COLUMN     "createdById" TEXT,
DROP COLUMN "method",
ADD COLUMN     "method" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SUCCESS',
ALTER COLUMN "paidAt" SET NOT NULL,
ALTER COLUMN "paidAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "public"."PharmacyItem" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PharmacySale" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacySale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_PatientToPayment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PatientToPayment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_CreatedInvoices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CreatedInvoices_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyItem_sku_key" ON "public"."PharmacyItem"("sku");

-- CreateIndex
CREATE INDEX "PharmacyItem_sku_idx" ON "public"."PharmacyItem"("sku");

-- CreateIndex
CREATE INDEX "PharmacyItem_name_idx" ON "public"."PharmacyItem"("name");

-- CreateIndex
CREATE INDEX "PharmacyItem_stock_idx" ON "public"."PharmacyItem"("stock");

-- CreateIndex
CREATE INDEX "PharmacyItem_createdAt_idx" ON "public"."PharmacyItem"("createdAt");

-- CreateIndex
CREATE INDEX "PharmacySale_itemId_idx" ON "public"."PharmacySale"("itemId");

-- CreateIndex
CREATE INDEX "PharmacySale_createdById_idx" ON "public"."PharmacySale"("createdById");

-- CreateIndex
CREATE INDEX "PharmacySale_createdAt_idx" ON "public"."PharmacySale"("createdAt");

-- CreateIndex
CREATE INDEX "Task_title_idx" ON "public"."Task"("title");

-- CreateIndex
CREATE INDEX "Task_completed_idx" ON "public"."Task"("completed");

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "public"."Task"("dueAt");

-- CreateIndex
CREATE INDEX "Task_createdById_idx" ON "public"."Task"("createdById");

-- CreateIndex
CREATE INDEX "Task_assignedTo_idx" ON "public"."Task"("assignedTo");

-- CreateIndex
CREATE INDEX "_PatientToPayment_B_index" ON "public"."_PatientToPayment"("B");

-- CreateIndex
CREATE INDEX "_CreatedInvoices_B_index" ON "public"."_CreatedInvoices"("B");

-- CreateIndex
CREATE INDEX "AestheticAddon_procedureId_idx" ON "public"."AestheticAddon"("procedureId");

-- CreateIndex
CREATE INDEX "AestheticConsent_patientId_idx" ON "public"."AestheticConsent"("patientId");

-- CreateIndex
CREATE INDEX "AestheticConsent_doctorId_idx" ON "public"."AestheticConsent"("doctorId");

-- CreateIndex
CREATE INDEX "AestheticConsent_signedAt_idx" ON "public"."AestheticConsent"("signedAt");

-- CreateIndex
CREATE INDEX "AestheticConsent_createdAt_idx" ON "public"."AestheticConsent"("createdAt");

-- CreateIndex
CREATE INDEX "AestheticConsent_deletedAt_idx" ON "public"."AestheticConsent"("deletedAt");

-- CreateIndex
CREATE INDEX "AestheticProcedure_patientId_idx" ON "public"."AestheticProcedure"("patientId");

-- CreateIndex
CREATE INDEX "AestheticProcedure_doctorId_idx" ON "public"."AestheticProcedure"("doctorId");

-- CreateIndex
CREATE INDEX "AestheticProcedure_status_idx" ON "public"."AestheticProcedure"("status");

-- CreateIndex
CREATE INDEX "AestheticProcedure_scheduledAt_idx" ON "public"."AestheticProcedure"("scheduledAt");

-- CreateIndex
CREATE INDEX "AestheticProcedure_createdAt_idx" ON "public"."AestheticProcedure"("createdAt");

-- CreateIndex
CREATE INDEX "AestheticProcedure_deletedAt_idx" ON "public"."AestheticProcedure"("deletedAt");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "public"."Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_idx" ON "public"."Appointment"("doctorId");

-- CreateIndex
CREATE INDEX "Appointment_date_idx" ON "public"."Appointment"("date");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "public"."Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_timeslot_idx" ON "public"."Appointment"("timeslot");

-- CreateIndex
CREATE INDEX "Appointment_createdAt_idx" ON "public"."Appointment"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "public"."AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_resourceId_idx" ON "public"."AuditLog"("resourceId");

-- CreateIndex
CREATE INDEX "AuditTrail_actorId_idx" ON "public"."AuditTrail"("actorId");

-- CreateIndex
CREATE INDEX "AuditTrail_action_idx" ON "public"."AuditTrail"("action");

-- CreateIndex
CREATE INDEX "AuditTrail_entityType_idx" ON "public"."AuditTrail"("entityType");

-- CreateIndex
CREATE INDEX "AuditTrail_entityId_idx" ON "public"."AuditTrail"("entityId");

-- CreateIndex
CREATE INDEX "AuditTrail_createdAt_idx" ON "public"."AuditTrail"("createdAt");

-- CreateIndex
CREATE INDEX "ClientAttendance_appointmentId_idx" ON "public"."ClientAttendance"("appointmentId");

-- CreateIndex
CREATE INDEX "ClientAttendance_attended_idx" ON "public"."ClientAttendance"("attended");

-- CreateIndex
CREATE INDEX "ClientAttendance_status_idx" ON "public"."ClientAttendance"("status");

-- CreateIndex
CREATE INDEX "ClientAttendance_createdAt_idx" ON "public"."ClientAttendance"("createdAt");

-- CreateIndex
CREATE INDEX "ClinicalNote_patientId_idx" ON "public"."ClinicalNote"("patientId");

-- CreateIndex
CREATE INDEX "ClinicalNote_createdById_idx" ON "public"."ClinicalNote"("createdById");

-- CreateIndex
CREATE INDEX "ClinicalNote_status_idx" ON "public"."ClinicalNote"("status");

-- CreateIndex
CREATE INDEX "ClinicalNote_createdAt_idx" ON "public"."ClinicalNote"("createdAt");

-- CreateIndex
CREATE INDEX "ClinicalNote_visitId_idx" ON "public"."ClinicalNote"("visitId");

-- CreateIndex
CREATE INDEX "ClinicalNote_approvedById_idx" ON "public"."ClinicalNote"("approvedById");

-- CreateIndex
CREATE INDEX "CommunicationLog_patientId_idx" ON "public"."CommunicationLog"("patientId");

-- CreateIndex
CREATE INDEX "CommunicationLog_type_idx" ON "public"."CommunicationLog"("type");

-- CreateIndex
CREATE INDEX "CommunicationLog_createdAt_idx" ON "public"."CommunicationLog"("createdAt");

-- CreateIndex
CREATE INDEX "DentalChart_appointmentId_idx" ON "public"."DentalChart"("appointmentId");

-- CreateIndex
CREATE INDEX "DentalChart_createdAt_idx" ON "public"."DentalChart"("createdAt");

-- CreateIndex
CREATE INDEX "DentalChart_createdById_idx" ON "public"."DentalChart"("createdById");

-- CreateIndex
CREATE INDEX "DentalChart_updatedBy_idx" ON "public"."DentalChart"("updatedBy");

-- CreateIndex
CREATE INDEX "DentalRecall_recallDate_idx" ON "public"."DentalRecall"("recallDate");

-- CreateIndex
CREATE INDEX "DentalRecall_createdAt_idx" ON "public"."DentalRecall"("createdAt");

-- CreateIndex
CREATE INDEX "DentalRecall_createdById_idx" ON "public"."DentalRecall"("createdById");

-- CreateIndex
CREATE INDEX "DentalTreatment_appointmentId_idx" ON "public"."DentalTreatment"("appointmentId");

-- CreateIndex
CREATE INDEX "DentalTreatment_createdAt_idx" ON "public"."DentalTreatment"("createdAt");

-- CreateIndex
CREATE INDEX "DentalTreatment_performedBy_idx" ON "public"."DentalTreatment"("performedBy");

-- CreateIndex
CREATE INDEX "DentalTreatment_updatedBy_idx" ON "public"."DentalTreatment"("updatedBy");

-- CreateIndex
CREATE INDEX "EntNote_patientId_idx" ON "public"."EntNote"("patientId");

-- CreateIndex
CREATE INDEX "EntNote_doctorId_idx" ON "public"."EntNote"("doctorId");

-- CreateIndex
CREATE INDEX "EntNote_status_idx" ON "public"."EntNote"("status");

-- CreateIndex
CREATE INDEX "EntNote_createdAt_idx" ON "public"."EntNote"("createdAt");

-- CreateIndex
CREATE INDEX "EntNote_deletedAt_idx" ON "public"."EntNote"("deletedAt");

-- CreateIndex
CREATE INDEX "EntSymptom_patientId_idx" ON "public"."EntSymptom"("patientId");

-- CreateIndex
CREATE INDEX "EntSymptom_doctorId_idx" ON "public"."EntSymptom"("doctorId");

-- CreateIndex
CREATE INDEX "EntSymptom_createdAt_idx" ON "public"."EntSymptom"("createdAt");

-- CreateIndex
CREATE INDEX "EntSymptom_deletedAt_idx" ON "public"."EntSymptom"("deletedAt");

-- CreateIndex
CREATE INDEX "Invoice_patientId_idx" ON "public"."Invoice"("patientId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "public"."Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_issued_at_idx" ON "public"."Invoice"("issued_at");

-- CreateIndex
CREATE INDEX "Invoice_reference_idx" ON "public"."Invoice"("reference");

-- CreateIndex
CREATE INDEX "Invoice_createdById_idx" ON "public"."Invoice"("createdById");

-- CreateIndex
CREATE INDEX "IvReaction_sessionId_idx" ON "public"."IvReaction"("sessionId");

-- CreateIndex
CREATE INDEX "IvReaction_type_idx" ON "public"."IvReaction"("type");

-- CreateIndex
CREATE INDEX "IvReaction_severity_idx" ON "public"."IvReaction"("severity");

-- CreateIndex
CREATE INDEX "IvReaction_recordedById_idx" ON "public"."IvReaction"("recordedById");

-- CreateIndex
CREATE INDEX "IvRecipe_createdById_idx" ON "public"."IvRecipe"("createdById");

-- CreateIndex
CREATE INDEX "IvRecipe_createdAt_idx" ON "public"."IvRecipe"("createdAt");

-- CreateIndex
CREATE INDEX "IvRecipe_deletedAt_idx" ON "public"."IvRecipe"("deletedAt");

-- CreateIndex
CREATE INDEX "IvSession_patientId_idx" ON "public"."IvSession"("patientId");

-- CreateIndex
CREATE INDEX "IvSession_recipeId_idx" ON "public"."IvSession"("recipeId");

-- CreateIndex
CREATE INDEX "IvSession_doctorId_idx" ON "public"."IvSession"("doctorId");

-- CreateIndex
CREATE INDEX "IvSession_status_idx" ON "public"."IvSession"("status");

-- CreateIndex
CREATE INDEX "IvSession_date_idx" ON "public"."IvSession"("date");

-- CreateIndex
CREATE INDEX "IvSession_createdAt_idx" ON "public"."IvSession"("createdAt");

-- CreateIndex
CREATE INDEX "IvSession_deletedAt_idx" ON "public"."IvSession"("deletedAt");

-- CreateIndex
CREATE INDEX "NoteSuggestion_patientId_idx" ON "public"."NoteSuggestion"("patientId");

-- CreateIndex
CREATE INDEX "NoteSuggestion_createdById_idx" ON "public"."NoteSuggestion"("createdById");

-- CreateIndex
CREATE INDEX "NoteSuggestion_status_idx" ON "public"."NoteSuggestion"("status");

-- CreateIndex
CREATE INDEX "NoteSuggestion_approvedById_idx" ON "public"."NoteSuggestion"("approvedById");

-- CreateIndex
CREATE INDEX "NoteSuggestion_createdAt_idx" ON "public"."NoteSuggestion"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_idx" ON "public"."Notification"("recipientId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "public"."Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "public"."Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "public"."Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Patient_email_idx" ON "public"."Patient"("email");

-- CreateIndex
CREATE INDEX "Patient_phone_idx" ON "public"."Patient"("phone");

-- CreateIndex
CREATE INDEX "Patient_status_idx" ON "public"."Patient"("status");

-- CreateIndex
CREATE INDEX "Patient_createdAt_idx" ON "public"."Patient"("createdAt");

-- CreateIndex
CREATE INDEX "Patient_firstName_lastName_idx" ON "public"."Patient"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "Patient_patientId_idx" ON "public"."Patient"("patientId");

-- CreateIndex
CREATE INDEX "Patient_registeredById_idx" ON "public"."Patient"("registeredById");

-- CreateIndex
CREATE INDEX "Patient_approvedById_idx" ON "public"."Patient"("approvedById");

-- CreateIndex
CREATE INDEX "Patient_userId_idx" ON "public"."Patient"("userId");

-- CreateIndex
CREATE INDEX "PatientHistory_patientId_idx" ON "public"."PatientHistory"("patientId");

-- CreateIndex
CREATE INDEX "PatientHistory_type_idx" ON "public"."PatientHistory"("type");

-- CreateIndex
CREATE INDEX "PatientHistory_createdAt_idx" ON "public"."PatientHistory"("createdAt");

-- CreateIndex
CREATE INDEX "PatientHistory_createdById_idx" ON "public"."PatientHistory"("createdById");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "public"."Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_method_idx" ON "public"."Payment"("method");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_transactionRef_idx" ON "public"."Payment"("transactionRef");

-- CreateIndex
CREATE INDEX "Payment_createdById_idx" ON "public"."Payment"("createdById");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "public"."Payment"("paidAt");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "public"."RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "public"."RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_revoked_idx" ON "public"."RefreshToken"("revoked");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "public"."RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_createdAt_idx" ON "public"."RefreshToken"("createdAt");

-- CreateIndex
CREATE INDEX "Reminder_email_idx" ON "public"."Reminder"("email");

-- CreateIndex
CREATE INDEX "Reminder_scheduledAt_idx" ON "public"."Reminder"("scheduledAt");

-- CreateIndex
CREATE INDEX "Reminder_sent_idx" ON "public"."Reminder"("sent");

-- CreateIndex
CREATE INDEX "Reminder_createdAt_idx" ON "public"."Reminder"("createdAt");

-- CreateIndex
CREATE INDEX "StaffAttendance_staffId_idx" ON "public"."StaffAttendance"("staffId");

-- CreateIndex
CREATE INDEX "StaffAttendance_clockIn_idx" ON "public"."StaffAttendance"("clockIn");

-- CreateIndex
CREATE INDEX "StaffAttendance_clockOut_idx" ON "public"."StaffAttendance"("clockOut");

-- CreateIndex
CREATE INDEX "StaffAttendance_createdAt_idx" ON "public"."StaffAttendance"("createdAt");

-- CreateIndex
CREATE INDEX "Visit_patientId_idx" ON "public"."Visit"("patientId");

-- CreateIndex
CREATE INDEX "Visit_visitDate_idx" ON "public"."Visit"("visitDate");

-- CreateIndex
CREATE INDEX "Visit_reason_idx" ON "public"."Visit"("reason");

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PharmacySale" ADD CONSTRAINT "PharmacySale_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."PharmacyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PharmacySale" ADD CONSTRAINT "PharmacySale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PatientToPayment" ADD CONSTRAINT "_PatientToPayment_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PatientToPayment" ADD CONSTRAINT "_PatientToPayment_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CreatedInvoices" ADD CONSTRAINT "_CreatedInvoices_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CreatedInvoices" ADD CONSTRAINT "_CreatedInvoices_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
