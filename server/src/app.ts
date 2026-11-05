import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { prisma } from './db.js';
import authRoutes from './routes/authRoutes.js';
import flightRoutes from './routes/flightRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { WebhookController } from './controllers/webhookController.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const clientDist = fs.existsSync(path.resolve(process.cwd(), 'client/dist'))
  ? path.resolve(process.cwd(), 'client/dist')
  : path.resolve(process.cwd(), '../client/dist');

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // Allow localhost, 127.0.0.1, or any LAN IP/host
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// API Root route - returns status and available service endpoints
app.get('/', (req, res) => {
  // If browser requests HTML and client build exists, serve the web application
  if (req.headers.accept?.includes('text/html') && fs.existsSync(clientDist)) {
    return res.sendFile(path.join(clientDist, 'index.html'));
  }

  res.status(200).json({
    status: 'ok',
    message: 'Flight booking API is running',
    service: 'CredoFly Flight Booking API Engine',
    version: '1.0.0',
    documentation: '/api/health',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5001',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      flights: '/api/flights',
      bookings: '/api/bookings',
      payment: '/api/payment',
      admin: '/api/admin',
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbConfigured = Boolean(process.env.DATABASE_URL);
  let dbConnected = false;
  let dbError: string | null = null;

  if (dbConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch (err: any) {
      dbError = err?.message || 'Database ping failed';
    }
  } else {
    dbError = 'DATABASE_URL environment variable is missing';
  }

  const isHealthy = dbConfigured && dbConnected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    database: {
      configured: dbConfigured,
      connected: dbConnected,
      error: dbError,
    },
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Resend Webhooks
app.post('/api/webhooks/resend', WebhookController.handleResendWebhook);

// Static frontend assets and client-side routing fallback for unified deployments
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Centralized error handling
app.use(errorHandler);

export default app;
