import express from 'express';
import cors from 'cors';
import env from './config/env.js';

import { initializeDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import resourceTypesRoutes from './routes/resourceTypes.js';
import resourcesRoutes from './routes/resources.js';
import roomsRoutes from './routes/rooms.js';
import bookingsRoutes from './routes/bookings.js';
import pricingRoutes from './routes/pricing.js';
import settingsRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';
import reportsRoutes from './routes/reports.js';

import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = env.PORT;
const CLIENT_ORIGINS = env.CORS_ORIGINS.length ? env.CORS_ORIGINS : true;

app.use(
  cors({
    origin: CLIENT_ORIGINS,
    credentials: true,
  }),
);
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'Booking Configuration backend is running.', status: 'ok' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'Booking Configuration API is running.', status: 'ok' });
});

app.get('/health', async (req, res) => {
  try {
    const db = await import('./db.js');
    await db.default.query('SELECT 1 AS ok');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: 'Backend is running but MySQL is unavailable.',
    });
  }
});

app.get('/health/db', async (req, res) => {
  try {
    const db = await import('./db.js');
    const [row] = await db.default.query('SELECT 1 AS ok');
    res.json({ status: 'ok', database: row?.ok === 1 ? 'connected' : 'unknown' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
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

app.use(notFoundHandler);
app.use(errorHandler);

await initializeDatabase();
app.listen(PORT, () => {
  console.log(`✅ ${env.APP_NAME} backend running on port ${PORT}`);
});
