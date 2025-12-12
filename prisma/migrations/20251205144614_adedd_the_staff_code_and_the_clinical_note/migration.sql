/*
  Warnings:

  - A unique constraint covering the columns `[staffCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."AuditTrail" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "public"."ClinicalNote" ADD COLUMN     "extendedData" JSONB;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "staffCode" TEXT;

-- CreateTable
CREATE TABLE "public"."IdCounter" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdCounter_role_key" ON "public"."IdCounter"("role");

-- CreateIndex
CREATE UNIQUE INDEX "User_staffCode_key" ON "public"."User"("staffCode");

-- AddForeignKey
ALTER TABLE "public"."AuditTrail" ADD CONSTRAINT "AuditTrail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
