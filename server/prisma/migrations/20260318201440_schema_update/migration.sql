/*
  Warnings:

  - You are about to drop the column `compareAtPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `cost` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryItemId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryQuantity` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `packagingCost` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `shippingCost` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyVariantId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "address1" TEXT,
ADD COLUMN     "address2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "firstOrderName" TEXT,
ADD COLUMN     "lastOrderName" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "zip" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "compareAtPrice",
DROP COLUMN "cost",
DROP COLUMN "inventoryItemId",
DROP COLUMN "inventoryQuantity",
DROP COLUMN "packagingCost",
DROP COLUMN "price",
DROP COLUMN "shippingCost",
DROP COLUMN "shopifyVariantId",
DROP COLUMN "sku";

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "shopifyVariantId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "sku" TEXT,
    "title" TEXT,
    "price" DOUBLE PRECISION,
    "compareAtPrice" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION,
    "inventoryQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_storeId_shopifyVariantId_key" ON "ProductVariant"("storeId", "shopifyVariantId");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
