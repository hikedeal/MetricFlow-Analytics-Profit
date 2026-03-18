# Adynic Performance - Production Backend Architecture

## Overview
This document outlines the high-performance backend architecture for **Adynic Performance**. The system is designed to scale to hundreds of stores and millions of orders, leveraging a robust caching layer, background job queues, and efficient database indexing.

## 1. Tech Stack
- **Backend Runtime**: Node.js (v18+)
- **Framework**: Express.js (Scalable REST API)
- **Database**: PostgreSQL 15+ (Managed)
- **ORM**: Prisma (Type-safe database access)
- **Caching**: Redis (StackExchange / Managed Redis)
- **Queue System**: BullMQ (Redis-based job processing)
- **Deployment**: Render (Auto-scaling, Persistent Workers)

## 2. Database Schema & Optimization
### Store Scoping
All critical data models are strictly scoped by `storeId` to ensure data isolation and enable future partitioning.
- `Order`, `Customer`, `Product`, `OrderLineItem`, `AnalyticsCache` -> **All contain `storeId`**.

### Indexing Strategy
Specific compound indexes have been added to support sub-second dashboard queries:
- **Orders**: `[storeId, createdAt]`, `[storeId, customerId]`, `[storeId, financialStatus]`, `[storeId, paymentGateway]`
- **Customers**: `[storeId, email]`, `[storeId, lastOrderDate]`, `[storeId, totalSpent]`
- **Products**: `[storeId, shopifyProductId]`, `[storeId, totalRevenue]`

### Partitioning Preparation
The schema allows for horizontal partitioning by `storeId` (sharding) in the future. The inclusion of `storeId` in `OrderLineItem` allows entire store datasets to reside on specific shards without cross-node joins.

## 3. Caching Strategy (Redis)
We adhere to a strict **"Cache First"** policy for all dashboard analytics:
1.  **Incoming Request**: `GET /api/dashboard/stats`
2.  **Check Redis**: `dashboard:metrics:{storeId}:{dateRange}`
3.  **Hit**: Return cached JSON (Latency < 50ms).
4.  **Miss**: 
    - Compute complex aggregates in Postgres.
    - Write result to Redis (TTL: 1 hour).
    - Return result.
5.  **Invalidation**: Webhooks (Order Create/Update) trigger a background job to refresh keys or invalidate them.

## 4. Background Job Processing
Heavy operations are offloaded to **BullMQ** to prevent blocking the main API thread.
- **Queue**: `shopify-sync`
- **Workers**:
    - `full-sync`: Handles initial store data import.
    - `orders-sync`: Incremental order updates.
- **Separation**: A dedicated `worker` service runs independently from the `web` service, ensuring that heavy sync jobs never degrade dashboard performance.

## 5. Shopify API Optimization
- **Rate Limiting**: Implementation of leaky bucket algorithm (via `shopify-api-node` or custom throttler) to respect Shopify's 40 requests/second variation.
- **Webhooks**: Primary mechanism for updates. We use `orders/create`, `orders/updated`, `orders/cancelled`.
- **Incremental Sync**: Only new or modified orders are fetched after the initial full sync.

## 6. Deployment (Render)
The application is configured for Render with:
- **Web Service**: Runs the Express API.
- **Worker Service**: Runs the BullMQ processor.
- **Environment**: Fully containerized with `render.yaml` defining build and start commands.
- **Connection Pooling**: Managed via Prisma and internal connection handling.

## 7. Security
- **Store Isolation**: Every DB query includes `where: { storeId }`.
- **Admin Access**: Protected via `x-admin-key`.
- **OAuth**: Standard Shopify OAuth 2.0 flow.

## 8. Future Scalability
- **AI Models**: The `AnalyticsCache` can store pre-calculated AI predictions (churn risk, LTV forecast).
- **Multi-Region**: The stateless API design allows deploying replicas in multiple regions (US, EU, APAC) close to the user, connected to a central Global Distributed Postgres (e.g., Neon or CockroachDB).
