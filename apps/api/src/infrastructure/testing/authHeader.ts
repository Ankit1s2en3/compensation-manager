import type { Express } from 'express';
import supertest from 'supertest';

import { SEEDED_USER } from './fixtures.js';

let cached: Promise<string> | null = null;

/**
 * The bearer header for the seeded HR user, logged in through the real
 * POST /api/auth/login — not minted directly — so a broken login endpoint
 * fails these tests too, not just its own.
 *
 * Memoized: the first call performs the login; every call after (from any
 * test file sharing this module) gets the same header instantly. Safe to
 * reuse across truncations — requireAuth verifies the token's signature and
 * expiry, it never re-queries the users table.
 */
export function authHeader(app: Express): Promise<string> {
  cached ??= login(app);
  return cached;
}

async function login(app: Express): Promise<string> {
  const response = await supertest(app).post('/api/auth/login').send({
    email: SEEDED_USER.email,
    password: SEEDED_USER.password,
  });
  const token = response.body.token as unknown;
  if (typeof token !== 'string') {
    throw new Error(
      `authHeader: login did not return a token (status ${response.status}, body ${JSON.stringify(response.body)})`,
    );
  }
  return `Bearer ${token}`;
}
