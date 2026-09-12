import cors from 'cors';
import express from 'express';
import type { Express } from 'express';

import type { Container } from './container.js';
import { errorHandler } from './middleware/errorHandler.js';
import { analyticsRoutes } from './routes/analytics.js';
import { employeeRoutes } from './routes/employees.js';
import { healthRoutes } from './routes/health.js';
import { salaryRecordRoutes } from './routes/salaryRecords.js';

const VITE_DEV_ORIGIN = 'http://localhost:5173';

/**
 * Routes stay thin: validate (zod schema), delegate (a use case), respond.
 * Business-rule branching lives in domain/ and application/, never here.
 */
export function createServer(container: Container): Express {
  const app = express();

  app.use(cors({ origin: VITE_DEV_ORIGIN }));
  app.use(express.json());

  app.use('/health', healthRoutes());
  app.use('/api/employees', employeeRoutes(container));
  app.use('/api/salary-records', salaryRecordRoutes(container));
  app.use('/api/analytics', analyticsRoutes(container));

  app.use(errorHandler);
  return app;
}
