import path from 'node:path';

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

// apps/api/public, whether this file is running as src/http/server.ts (dev,
// via tsx) or as the compiled dist/http/server.js (prod) — either way it's
// two levels up from this file, so this is independent of process.cwd().
const PUBLIC_DIR = path.join(import.meta.dirname, '..', '..', 'public');

/**
 * Routes stay thin: validate (zod schema), delegate (a use case), respond.
 * Business-rule branching lives in domain/ and application/, never here.
 *
 * /health is mounted outside /api entirely — Render's health check carries
 * no token. /api/auth/login is mounted before the blanket requireAuth below
 * it, so it's the one /api route that doesn't need one; everything mounted
 * after requireAuth does. The static frontend + SPA fallback are mounted
 * after every /api route (so an unmatched /api/* path still 404s instead of
 * getting index.html back) and are never behind requireAuth — the login
 * page itself has to load for a browser with no token yet.
 */
export function createServer(container: Container, jwtSecret: string): Express {
  const app = express();

  // Production is same-origin (the API serves the built frontend below), so
  // no CORS is needed there. Dev serves the frontend from Vite on 5173,
  // a different origin from the API — allow only that, and only in dev.
  if (process.env.NODE_ENV !== 'production') {
    app.use(cors({ origin: VITE_DEV_ORIGIN }));
  }

  app.use(express.json());

  app.use('/health', healthRoutes());
  app.use('/api/auth', authRoutes(container));

  app.use('/api', requireAuth(jwtSecret));

  app.use('/api/employees', employeeRoutes(container));
  app.use('/api/salary-records', salaryRecordRoutes(container));
  app.use('/api/analytics', analyticsRoutes(container));

  // The built frontend. express.static serves real files (JS/CSS/index.html
  // at /); the fallback below covers client-side routes with no matching
  // file — a hard refresh on /employees/123 — by handing back index.html and
  // letting the SPA's router take it from there.
  app.use(express.static(PUBLIC_DIR));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.use(errorHandler);
  return app;
}
