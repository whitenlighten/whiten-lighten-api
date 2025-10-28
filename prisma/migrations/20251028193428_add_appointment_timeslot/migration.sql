/*
  Warnings:

  - Added the required column `timeslot` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Appointment" ADD COLUMN     "maritalStatus" "public"."MaritalStatus",
ADD COLUMN     "timeslot" TIMESTAMP(3) NOT NULL;
