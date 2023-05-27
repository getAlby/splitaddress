/*
  Warnings:

  - The primary key for the `LightningAddress` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `LightningAddress` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Split" DROP CONSTRAINT "Split_lightningAddressId_fkey";

-- AlterTable
ALTER TABLE "LightningAddress" DROP CONSTRAINT "LightningAddress_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "LightningAddress_pkey" PRIMARY KEY ("username");

-- AddForeignKey
ALTER TABLE "Split" ADD CONSTRAINT "Split_lightningAddressId_fkey" FOREIGN KEY ("lightningAddressId") REFERENCES "LightningAddress"("username") ON DELETE CASCADE ON UPDATE CASCADE;
