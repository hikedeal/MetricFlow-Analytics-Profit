import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import prisma from './config/prisma';

// Load environment variables
dotenv.config();

// Import configurations
import { corsOptions } from './config/cors';
import { rateLimiter } from './config/rateLimit';
import { logger } from './config/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import ordersRoutes from './routes/orders.routes';
import customersRoutes from './routes/customers.routes';
import productsRoutes from './routes/products.routes';
import analyticsRoutes from './routes/analytics.routes';
import webhookRoutes from './routes/webhook.routes';
import exportRoutes from './routes/export.routes';
import alertsRoutes from './routes/alerts.routes';
import settingsRoutes from './routes/settings.routes';
import syncRoutes from './routes/sync.routes';
import segmentRoutes from './routes/segment.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authenticate } from './middleware/auth';

// Import services
import { initializeRedis } from './services/redis.service';
import { initializeBackgroundJobs } from './jobs';

const app: Application = express();
const PORT = process.env.PORT || 5001;

// Trust proxy for ngrok/forwarding
app.set('trust proxy', true);

// Create HTTP server
const server = createServer(app);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", "data:", "https:"],
            frameAncestors: ["'self'", "https://admin.shopify.com", "https://*.myshopify.com"],
        },
    },
    frameguard: false, // Allow framing for Shopify
}));

// CORS
app.use(cors(corsOptions));

// Ngrok Bypass Middleware
app.use((_req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
});

// Compression
app.use(compression());

// Body parsing
// Capture raw body for Shopify webhook HMAC verification
app.use(express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
        // More robust path check using originalUrl
        if (req.originalUrl?.startsWith('/api/webhooks')) {
            req.rawBody = buf;
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use('/api/', rateLimiter);

// Health check endpoint (no auth required)
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});

// Root path redirect (to frontend or auth login if needed)
app.get('/', async (req, res, next) => {
    const shop = req.query.shop as string;

    if (shop) {
        // Check if we already have this store and it's active
        const store = await prisma.store.findUnique({
            where: { shopifyDomain: shop }
        });

        if (store && store.isActive) {
            // Already installed and active, let the frontend handle it (proxy to Vite or serve static)
            return next();
        }

        // Escape iframe for OAuth to avoid cookie issues
        const appUrl = process.env.SHOPIFY_APP_URL || '';
        res.send(`
            <html>
            <head>
                <script type="text/javascript">
                    const params = new URLSearchParams(window.location.search);
                    const shop = params.get('shop');
                    const host = params.get('host');
                    const redirectUrl = \`${appUrl}/api/auth/login?shop=\${shop}&host=\${host}\`;
                    
                    if (window.top !== window.self) {
                        window.top.location.href = redirectUrl;
                    } else {
                        window.location.href = redirectUrl;
                    }
                </script>
            </head>
            <body>
                <div style="font-family: sans-serif; text-align: center; padding-top: 100px;">
                    <p>Redirecting to authentication...</p>
                    <p style="font-size: 12px; color: #666;">If you are not redirected automatically, <a href="/api/auth/login?shop=${shop}&host=${req.query.host}" target="_top">click here</a>.</p>
                </div>
            </body>
            </html>
        `);
        return;
    }
    return res.redirect('/');
});

// API Routes - Webhooks (Outside rate limit to avoid blocking Shopify bursts)
app.use('/api/webhooks', webhookRoutes);

// Rate limiting (Applies to all subsequent routes)
app.use('/api/', rateLimiter);

app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/orders', authenticate, ordersRoutes);
app.use('/api/customers', authenticate, customersRoutes);
app.use('/api/products', authenticate, productsRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/export', authenticate, exportRoutes);
app.use('/api/alerts', authenticate, alertsRoutes);
app.use('/api/settings', authenticate, settingsRoutes);
app.use('/api/sync', authenticate, syncRoutes);
app.use('/api/segments', authenticate, segmentRoutes);

// Admin routes (Protected by Admin Key)
import { adminRoutes } from './routes/admin.routes';
app.use('/api/admin', adminRoutes);

// Serve frontend in development - Proxy all other requests to Vite
if (process.env.NODE_ENV === 'development') {
    app.use('/', createProxyMiddleware({
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true, // proxy websockets for Vite HMR
        pathFilter: (path) => {
            // Only proxy if it's NOT an API route or health check
            return !path.startsWith('/api') && !path.startsWith('/health');
        },
    }));
} else {
    // Serve frontend in production
    const clientBuildPath = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientBuildPath));

    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(clientBuildPath, 'index.html'));
        } else {
            res.status(404).json({ error: 'Not Found', message: `API Route ${req.method} ${req.path} not found` });
        }
    });
}

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
    try {
        // Initialize Redis (optional - don't block if it fails)
        try {
            await initializeRedis();
            logger.info('Redis initialized successfully');
        } catch (redisError) {
            logger.warn('Redis initialization failed, continuing without cache:', redisError);
        }

        // Initialize background jobs
        if (process.env.ENABLE_BACKGROUND_JOBS === 'true') {
            try {
                await initializeBackgroundJobs();
                logger.info('Background jobs initialized successfully');
            } catch (jobsError) {
                logger.warn('Background jobs initialization failed:', jobsError);
            }
        }

        // Start server
        server.listen(Number(PORT), () => {
            logger.info(`🚀 Adynic Performance Server running on port ${PORT}`);
            logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
            logger.info(`🔗 API URL: http://localhost:${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();

export default app;
