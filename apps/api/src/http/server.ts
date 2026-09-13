import cors from 'cors';
import express from 'express';
import type { Express } from 'express';

import type { Container } from '../container.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/requireAuth.js';
import { analyticsRoutes } from './routes/analytics.js';
import { authRoutes } from './routes/auth.js';
import { employeeRoutes } from './routes/employees.js';
import { healthRoutes } from './routes/health.js';
import { salaryRecordRoutes } from './routes/salaryRecords.js';

const VITE_DEV_ORIGIN = 'http://localhost:5173';

/**
 * Routes stay thin: validate (zod schema), delegate (a use case), respond.
 * Business-rule branching lives in domain/ and application/, never here.
 *
 * /health is mounted outside /api entirely — Render's health check carries
 * no token. /api/auth/login is mounted before the blanket requireAuth below
 * it, so it's the one /api route that doesn't need one; everything mounted
 * after requireAuth does.
 */
export function createServer(container: Container, jwtSecret: string): Express {
  const app = express();

  app.use(cors({ origin: VITE_DEV_ORIGIN }));
  app.use(express.json());

  app.use('/health', healthRoutes());
  app.use('/api/auth', authRoutes(container));

  app.use('/api', requireAuth(jwtSecret));

  app.use('/api/employees', employeeRoutes(container));
  app.use('/api/salary-records', salaryRecordRoutes(container));
  app.use('/api/analytics', analyticsRoutes(container));

  app.use(errorHandler);
  return app;
}
