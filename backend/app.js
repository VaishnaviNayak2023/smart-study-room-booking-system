import './middleware/asyncHandler.js';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import db, { checkDatabase } from './db.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './routes/auth.js';
import resourceTypesRoutes from './routes/resourceTypes.js';
import resourcesRoutes from './routes/resources.js';
import roomsRoutes from './routes/rooms.js';
import bookingsRoutes from './routes/bookings.js';
import pricingRoutes from './routes/pricing.js';
import settingsRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';
import reportsRoutes from './routes/reports.js';
import notificationsRoutes from './routes/notifications.js';
import userPreferencesRoutes from './routes/userPreferences.js';

/**
 * Build the Express application without starting an HTTP listener.
 * Call startServer() in server.js for process lifecycle.
 */
export function createApp() {
  const app = express();
  // In local development, frontend dev server origin can vary. Allow all origins
  // in development to prevent Axios from failing with generic auth errors.
  const CLIENT_ORIGINS = env.NODE_ENV === 'development' ? true : env.CORS_ORIGINS.length ? env.CORS_ORIGINS : true;

  app.use(
    cors({
      origin: CLIENT_ORIGINS,
      credentials: true,
    }),
  );
  // Allow small base64 image payloads when creating/updating resources.
  app.use(express.json({ limit: '6mb' }));
  const uploadsDir = path.join(__dirname, 'uploads');
  // Public asset paths (direct) and /api/uploads (works through the Vite /api proxy).
  app.use('/uploads', express.static(uploadsDir));
  app.use('/api/uploads', express.static(uploadsDir));

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/', (req, res) => {
    res.json({
      message: `${env.APP_NAME} backend is running.`,
      status: 'ok',
    });
  });

  app.get('/api', (req, res) => {
    res.json({
      message: `${env.APP_NAME} API is running.`,
      status: 'ok',
    });
  });

  // Liveness: process is up (does not require DB)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness: required dependencies available
  app.get('/ready', async (req, res) => {
    const database = await checkDatabase();
    if (!database.ok) {
      return res.status(503).json({
        status: 'not_ready',
        database: 'disconnected',
        message: 'Required dependency unavailable: database',
      });
    }

    return res.json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  });

  // Backward-compatible DB probe
  app.get('/health/db', async (req, res) => {
    const database = await checkDatabase();
    if (!database.ok) {
      return res.status(503).json({ status: 'error', database: 'disconnected' });
    }
    return res.json({ status: 'ok', database: 'connected' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/resource-types', resourceTypesRoutes);
  app.use('/api/resources', resourcesRoutes);
  app.use('/api/rooms', roomsRoutes);
  app.use('/api/bookings', bookingsRoutes);
  app.use('/api/pricing-rules', pricingRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/user-preferences', userPreferencesRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.locals.db = db;

  return app;
}

export default createApp;
