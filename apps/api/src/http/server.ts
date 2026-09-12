import cors from 'cors';
import express from 'express';
import type { Express } from 'express';

import type { Container } from './container.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRoutes } from './routes/health.js';

const VITE_DEV_ORIGIN = 'http://localhost:5173';

/**
 * Routes stay thin: validate (zod schema), delegate (a use case), respond.
 * Business-rule branching lives in domain/ and application/, never here.
 * `container` is unused until the first api/ route is mounted.
 */
export function createServer(container: Container): Express {
  const app = express();

  app.use(cors({ origin: VITE_DEV_ORIGIN }));
  app.use(express.json());

  app.use('/health', healthRoutes());

  app.use(errorHandler);
  return app;
}
