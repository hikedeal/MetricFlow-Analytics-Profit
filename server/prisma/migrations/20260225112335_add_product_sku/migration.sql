-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "avgOrderGapDays" DOUBLE PRECISION,
ADD COLUMN     "nextPurchaseDate" TIMESTAMP(3),
ADD COLUMN     "purchaseProbability" DOUBLE PRECISION,
ADD COLUMN     "tags" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "isReturned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "returnedAt" TIMESTAMP(3),
ADD COLUMN     "rtoAt" TIMESTAMP(3),
ADD COLUMN     "shippingAddressCity" TEXT,
ADD COLUMN     "shippingAddressCountry" TEXT,
ADD COLUMN     "shippingAddressProvince" TEXT,
ADD COLUMN     "shippingAddressZip" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "inventoryItemId" TEXT,
ADD COLUMN     "inventoryQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shopifyVariantId" TEXT,
ADD COLUMN     "sku" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "primaryLocationId" TEXT,
ADD COLUMN     "shopifyApiKey" TEXT,
ADD COLUMN     "shopifyApiSecret" TEXT;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "defaultCogsPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "emailMarketingSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "facebookSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "googleAdsSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "instagramSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tiktokSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "useProductCost" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AppRegistry" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppRegistry_shopDomain_key" ON "AppRegistry"("shopDomain");

-- CreateIndex
CREATE INDEX "Order_storeId_isReturned_idx" ON "Order"("storeId", "isReturned");

-- CreateIndex
CREATE INDEX "Order_storeId_cancelledAt_idx" ON "Order"("storeId", "cancelledAt");

-- CreateIndex
CREATE INDEX "Order_storeId_rtoAt_idx" ON "Order"("storeId", "rtoAt");

-- CreateIndex
CREATE INDEX "Order_storeId_returnedAt_idx" ON "Order"("storeId", "returnedAt");

-- CreateIndex
CREATE INDEX "Order_storeId_refundedAt_idx" ON "Order"("storeId", "refundedAt");
