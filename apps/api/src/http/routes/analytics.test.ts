import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { authHeader } from '../../infrastructure/testing/authHeader.js';
import { testDb } from '../../infrastructure/testing/testDb.js';
import { TEST_JWT_SECRET } from '../../infrastructure/testing/testJwtSecret.js';
import { createContainer } from '../../container.js';
import { createServer } from '../server.js';

const app = createServer(
  createContainer(testDb, TEST_JWT_SECRET),
  TEST_JWT_SECRET,
);

describe('GET /api/analytics/compensation', () => {
  it('groups by department', async () => {
    const response = await supertest(app)
      .get('/api/analytics/compensation')
      .set('Authorization', await authHeader(app))
      .query({ groupBy: 'department' });

    expect(response.status).toBe(200);

    // Engineering (active): 1, 2, 5, 6, 7 — same fixture math as the
    // DrizzleCompensationStatsQuery integration test.
    const engineering = (
      response.body as Array<{ label: string }>
    ).find((r) => r.label === 'Engineering');
    expect(engineering).toEqual({
      key: expect.any(String),
      label: 'Engineering',
      headcount: 5,
      totalBaseMinor: 52_438_000,
      meanBaseMinor: 10_487_600,
      medianBaseMinor: 10_500_000,
      p25BaseMinor: 9_288_000,
      p75BaseMinor: 12_000_000,
    });
  });

  it('rejects an unknown groupBy with 400', async () => {
    const response = await supertest(app)
      .get('/api/analytics/compensation')
      .set('Authorization', await authHeader(app))
      .query({ groupBy: 'nonsense' });

    expect(response.status).toBe(400);
  });
});
