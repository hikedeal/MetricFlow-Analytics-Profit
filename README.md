# Adynic Performance

**Advanced Shopify Analytics & Performance Intelligence App**

A production-ready, scalable Shopify embedded app that provides comprehensive performance marketing intelligence and store analytics for Shopify merchants.

## 🎯 Features

### Core Analytics Modules
- **Sales Intelligence Dashboard** - Comprehensive sales metrics and KPIs
- **Order Tag Intelligence** - Automated categorization and cancellation analysis
- **Customer Intelligence** - LTV, RFM analysis, and customer segmentation
- **Sales & Order Trends** - Visual trend analysis with interactive charts
- **Product Performance** - Top performers and cancellation insights
- **Profit Readiness** - Cost tracking and profit margin analysis
- **Marketing Intelligence** - Ready for Meta/Google Ads integration
- **Alerts & Insights Engine** - Automated anomaly detection

### Key Capabilities
- Real-time webhook integration
- Advanced date filtering (14 preset ranges + custom)
- Multi-dimensional filtering
- Export to CSV/Excel/PDF
- Scheduled reports
- Dark/Light mode
- Mobile responsive
- Multi-store architecture

## 🏗️ Architecture

```
adynic-performance/
├── server/                 # Node.js + Express backend
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   ├── utils/         # Utility functions
│   │   ├── jobs/          # Background jobs
│   │   └── webhooks/      # Shopify webhooks
│   └── package.json
│
├── client/                # React + Shopify Polaris frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   ├── utils/         # Utilities
│   │   ├── contexts/      # React contexts
│   │   └── assets/        # Static assets
│   └── package.json
│
└── package.json           # Root package manager
```

## 🚀 Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **ORM**: Prisma
- **Authentication**: Shopify OAuth
- **API**: Shopify Admin API, GraphQL

### Frontend
- **Framework**: React 18
- **UI Library**: Shopify Polaris
- **App Bridge**: Shopify App Bridge
- **Charts**: Recharts
- **State Management**: React Query
- **Routing**: React Router

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Shopify Partner Account

### Setup Steps

1. **Clone and Install**
```bash
cd /Users/arnavkumar/Desktop/shopify\ app
npm run install:all
```

2. **Configure Environment**
```bash
# Server environment
cp server/.env.example server/.env
# Edit server/.env with your credentials

# Client environment
cp client/.env.example client/.env
# Edit client/.env with your settings
```

3. **Database Setup**
```bash
npm run db:migrate
npm run db:seed
```

4. **Start Development**
```bash
# Give execution permission
chmod +x start-dev.sh

# Run the full stack app
./start-dev.sh
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔧 Configuration

### Server Environment Variables
```env
# Shopify
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=read_orders,read_customers,read_products,read_inventory,read_discounts,read_fulfillments
SHOPIFY_APP_URL=https://your-app-url.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/adynic_performance

# Redis
REDIS_URL=redis://localhost:6379

# App
NODE_ENV=development
PORT=5000
SESSION_SECRET=your_session_secret
```

### Client Environment Variables
```env
VITE_API_URL=http://localhost:5000
VITE_SHOPIFY_API_KEY=your_api_key
```

## 📊 Dashboard Modules

### 1. Sales Intelligence
- Gross Sales, Net Sales, Net Revenue
- Total Orders, Cancelled Orders, RTO Orders
- Cancellation Rate, Refund Amount
- Average Order Value, Repeat Customer Rate
- Total Discounts Given, Orders Edited Count

### 2. Date Filters
- Today, Yesterday
- Last 7/14/30/60/90 days
- This Month, Last Month
- This Quarter, Last Quarter
- This Year, Custom Range, All-time

### 3. Order Tag Intelligence
- Automatic tag categorization
- Cancel reasons breakdown
- RTO percentage tracking
- Tag-wise order counts
- Loss amount by tag

### 4. Customer Intelligence
- Top 20 customers by LTV
- Order frequency analysis
- Last purchase tracking
- Repeat buyer identification
- RFM segmentation structure

### 5. Product Performance
- Top selling products
- Low performing products
- Product cancellation rates
- Revenue per product
- Units sold tracking

### 6. Profit Readiness
- Manual cost input (product, shipping, packaging)
- Profit estimate calculation
- Profit margin analysis
- Loss due to cancellations

### 7. Alerts & Insights
- Cancellation rate increases
- Sales drops
- Refund spikes
- Low repeat customer alerts

## 🔗 Shopify Integration

### APIs Used
- Admin REST API
- Admin GraphQL API
- Orders API
- Customers API
- Products API
- Inventory API
- Discounts API
- Fulfillment API

### Webhooks Implemented
- `orders/create`
- `orders/updated`
- `orders/cancelled`
- `fulfillments/create`
- `fulfillments/update`
- `refunds/create`
- `customers/create`
- `customers/update`

## 📈 Scalability Features

- Multi-store architecture support
- Background job processing
- Redis caching layer
- Database indexing optimization
- Webhook queue management
- Rate limiting compliance
- Horizontal scaling ready

## 🎨 UI/UX Features

- Modern SaaS dashboard design
- Shopify Polaris components
- Dark/Light mode toggle
- Mobile responsive layout
- Interactive charts and graphs
- KPI cards with trends
- Loading states and skeletons
- Error boundaries

## 📤 Export & Reports

- CSV export
- Excel export
- PDF report generation
- Scheduled email reports
- Custom date range exports
- Filtered data exports

## 🔮 Future Enhancements

- Meta Ads integration
- Google Ads integration
- ROAS dashboard
- CAC tracking
- Marketing attribution
- Automated insights
- Predictive analytics
- AI-powered recommendations

## 🛠️ Development

### Project Structure
- **Modular architecture** - Separation of concerns
- **Type safety** - TypeScript throughout
- **API versioning** - Future-proof API design
- **Error handling** - Comprehensive error management
- **Logging** - Structured logging with Winston
- **Testing ready** - Jest/Vitest setup

### Code Quality
- ESLint configuration
- Prettier formatting
- Pre-commit hooks
- TypeScript strict mode

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Support

For issues and questions, please contact support@adynic.com

---

**Built with ❤️ for Shopify Merchants**
