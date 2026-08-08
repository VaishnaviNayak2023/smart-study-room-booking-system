import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import './db.js';

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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:9000';

app.use(
  cors({
    origin: CLIENT_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

/* Health check */
app.get('/api', (req, res) => {
  res.json({ message: 'Booking Configuration API is running.', status: 'ok' });
});

/* Routes */
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

app.listen(PORT, () => {
  console.log(`✅ Booking Configuration backend running on http://localhost:${PORT}`);
});

