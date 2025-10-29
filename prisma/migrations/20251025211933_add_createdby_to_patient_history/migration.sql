-- AlterTable
ALTER TABLE "public"."PatientHistory" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "public"."PatientHistory" ADD CONSTRAINT "PatientHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
