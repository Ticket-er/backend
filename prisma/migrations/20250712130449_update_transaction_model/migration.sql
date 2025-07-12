/*
  Warnings:

  - You are about to drop the column `ticketId` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_ticketId_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "ticketId";

-- CreateTable
CREATE TABLE "TransactionTicket" (
    "transactionId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,

    CONSTRAINT "TransactionTicket_pkey" PRIMARY KEY ("transactionId","ticketId")
);

-- AddForeignKey
ALTER TABLE "TransactionTicket" ADD CONSTRAINT "TransactionTicket_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionTicket" ADD CONSTRAINT "TransactionTicket_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
