/*
  Warnings:

  - You are about to drop the column `fee` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `netAmount` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `royalty` on the `Transaction` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Integer`.
  - A unique constraint covering the columns `[reference]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `reference` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PRIMARY', 'RESALE', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "fee",
DROP COLUMN "netAmount",
DROP COLUMN "royalty",
ADD COLUMN     "reference" TEXT NOT NULL,
ADD COLUMN     "status" "TransactionStatus" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "TransactionType" NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- DropEnum
DROP TYPE "TxType";

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");
