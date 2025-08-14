/*
  Warnings:

  - Made the column `category` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "EventCategory" ADD VALUE 'PARTY';

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "category" SET NOT NULL;
