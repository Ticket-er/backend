-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "bankCode" TEXT;

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "pin" TEXT;
