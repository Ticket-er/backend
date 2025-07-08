-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "resaleCommission" INTEGER,
ADD COLUMN     "resaleCount" INTEGER NOT NULL DEFAULT 0;
