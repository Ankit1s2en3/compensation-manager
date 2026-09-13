import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { testDb } from '../../infrastructure/testing/testDb.js';
import { TEST_JWT_SECRET } from '../../infrastructure/testing/testJwtSecret.js';
import { createContainer } from '../../container.js';
import { createServer } from '../server.js';

const app = createServer(
  createContainer(testDb, TEST_JWT_SECRET),
  TEST_JWT_SECRET,
);

describe('GET /health', () => {
  it('returns 200 without touching the database', async () => {
    const response = await supertest(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
