import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import flightRoutes from './routes/flightRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { WebhookController } from './controllers/webhookController.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

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
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Resend Webhooks
app.post('/api/webhooks/resend', WebhookController.handleResendWebhook);

// Centralized error handling
app.use(errorHandler);

export default app;
