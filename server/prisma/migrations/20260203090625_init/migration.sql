-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "shopifyDomain" TEXT NOT NULL,
    "shopifyStoreId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "storeName" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "enableProfitTracking" BOOLEAN NOT NULL DEFAULT false,
    "defaultShippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defaultPackagingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "codExtraCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentGatewayFee" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "returnCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rtoCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marketingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "agencyFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shopifyBillingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "miscCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cancelledTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rtoTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "returnTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "editedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enableAlerts" BOOLEAN NOT NULL DEFAULT true,
    "cancellationThreshold" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "refundThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "alertCancellationSpike" BOOLEAN NOT NULL DEFAULT true,
    "alertSalesDrop" BOOLEAN NOT NULL DEFAULT true,
    "alertRefundSpike" BOOLEAN NOT NULL DEFAULT true,
    "alertInventoryLow" BOOLEAN NOT NULL DEFAULT true,
    "syncFrequency" TEXT NOT NULL DEFAULT 'manual',
    "vipThreshold" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "churnDays" INTEGER NOT NULL DEFAULT 90,
    "multiCurrency" BOOLEAN NOT NULL DEFAULT false,
    "taxIncluded" BOOLEAN NOT NULL DEFAULT true,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enableScheduledReports" BOOLEAN NOT NULL DEFAULT false,
    "reportFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "reportEmail" TEXT,
    "autoExport" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "defaultDateRange" TEXT NOT NULL DEFAULT 'last_30_days',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderName" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "subtotalPrice" DOUBLE PRECISION NOT NULL,
    "totalDiscounts" DOUBLE PRECISION NOT NULL,
    "totalTax" DOUBLE PRECISION NOT NULL,
    "totalShipping" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "financialStatus" TEXT NOT NULL,
    "fulfillmentStatus" TEXT,
    "paymentGateway" TEXT,
    "customerId" TEXT,
    "customerEmail" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "isRTO" BOOLEAN NOT NULL DEFAULT false,
    "isFraud" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundedAt" TIMESTAMP(3),
    "orderDate" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "landingSite" TEXT,
    "referringSite" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLineItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT,
    "shopifyProductId" TEXT,
    "shopifyVariantId" TEXT,
    "title" TEXT NOT NULL,
    "variantTitle" TEXT,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "totalDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "shopifyCustomerId" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "averageOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recencyDays" INTEGER,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "monetary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rfmScore" INTEGER,
    "segment" TEXT,
    "firstOrderDate" TIMESTAMP(3),
    "lastOrderDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "vendor" TEXT,
    "productType" TEXT,
    "price" DOUBLE PRECISION,
    "compareAtPrice" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION,
    "shippingCost" DOUBLE PRECISION,
    "packagingCost" DOUBLE PRECISION,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCancelled" INTEGER NOT NULL DEFAULT 0,
    "cancellationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "nextScheduledAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsCache" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_shopifyDomain_key" ON "Store"("shopifyDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Store_shopifyStoreId_key" ON "Store"("shopifyStoreId");

-- CreateIndex
CREATE INDEX "Store_shopifyDomain_idx" ON "Store"("shopifyDomain");

-- CreateIndex
CREATE INDEX "Store_isActive_idx" ON "Store"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StoreSettings_storeId_key" ON "StoreSettings"("storeId");

-- CreateIndex
CREATE INDEX "Order_storeId_orderDate_idx" ON "Order"("storeId", "orderDate");

-- CreateIndex
CREATE INDEX "Order_storeId_isCancelled_idx" ON "Order"("storeId", "isCancelled");

-- CreateIndex
CREATE INDEX "Order_storeId_isRTO_idx" ON "Order"("storeId", "isRTO");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_orderDate_idx" ON "Order"("orderDate");

-- CreateIndex
CREATE INDEX "Order_storeId_createdAt_idx" ON "Order"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_storeId_customerId_idx" ON "Order"("storeId", "customerId");

-- CreateIndex
CREATE INDEX "Order_storeId_financialStatus_idx" ON "Order"("storeId", "financialStatus");

-- CreateIndex
CREATE INDEX "Order_storeId_paymentGateway_idx" ON "Order"("storeId", "paymentGateway");

-- CreateIndex
CREATE UNIQUE INDEX "Order_storeId_shopifyOrderId_key" ON "Order"("storeId", "shopifyOrderId");

-- CreateIndex
CREATE INDEX "OrderLineItem_orderId_idx" ON "OrderLineItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderLineItem_productId_idx" ON "OrderLineItem"("productId");

-- CreateIndex
CREATE INDEX "Customer_storeId_totalSpent_idx" ON "Customer"("storeId", "totalSpent");

-- CreateIndex
CREATE INDEX "Customer_storeId_segment_idx" ON "Customer"("storeId", "segment");

-- CreateIndex
CREATE INDEX "Customer_storeId_email_idx" ON "Customer"("storeId", "email");

-- CreateIndex
CREATE INDEX "Customer_storeId_lastOrderDate_idx" ON "Customer"("storeId", "lastOrderDate");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_storeId_shopifyCustomerId_key" ON "Customer"("storeId", "shopifyCustomerId");

-- CreateIndex
CREATE INDEX "Product_storeId_totalRevenue_idx" ON "Product"("storeId", "totalRevenue");

-- CreateIndex
CREATE INDEX "Product_storeId_cancellationRate_idx" ON "Product"("storeId", "cancellationRate");

-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_shopifyProductId_key" ON "Product"("storeId", "shopifyProductId");

-- CreateIndex
CREATE INDEX "SyncJob_storeId_status_idx" ON "SyncJob"("storeId", "status");

-- CreateIndex
CREATE INDEX "SyncJob_jobType_idx" ON "SyncJob"("jobType");

-- CreateIndex
CREATE INDEX "Alert_storeId_isRead_idx" ON "Alert"("storeId", "isRead");

-- CreateIndex
CREATE INDEX "Alert_storeId_severity_idx" ON "Alert"("storeId", "severity");

-- CreateIndex
CREATE INDEX "Report_storeId_isActive_idx" ON "Report"("storeId", "isActive");

-- CreateIndex
CREATE INDEX "Report_nextScheduledAt_idx" ON "Report"("nextScheduledAt");

-- CreateIndex
CREATE INDEX "AnalyticsCache_storeId_expiresAt_idx" ON "AnalyticsCache"("storeId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsCache_storeId_cacheKey_key" ON "AnalyticsCache"("storeId", "cacheKey");

-- AddForeignKey
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsCache" ADD CONSTRAINT "AnalyticsCache_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
