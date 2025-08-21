/*
  Warnings:

  - You are about to drop the column `minted` on the `Event` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_ticketCategoryId_fkey";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "minted";

-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "ticketCategoryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TicketCategory" ADD COLUMN     "minted" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketCategoryId_fkey" FOREIGN KEY ("ticketCategoryId") REFERENCES "TicketCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
