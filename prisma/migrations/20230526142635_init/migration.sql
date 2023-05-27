-- CreateTable
CREATE TABLE "LightningAddress" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "LightningAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Split" (
    "id" TEXT NOT NULL,
    "lightningAddressId" TEXT NOT NULL,
    "recipientLightningAddress" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,

    CONSTRAINT "Split_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Split" ADD CONSTRAINT "Split_lightningAddressId_fkey" FOREIGN KEY ("lightningAddressId") REFERENCES "LightningAddress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
