import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { testDb } from '../../infrastructure/testing/testDb.js';
import { createContainer } from '../container.js';
import { createServer } from '../server.js';

const app = createServer(createContainer(testDb));

describe('GET /api/employees', () => {
  it('filters by department and paginates', async () => {
    // Engineering (department 1) fixtures: 1, 2, 5, 6, 7
    const all = await supertest(app)
      .get('/api/employees')
      .query({ department: '1' });

    expect(all.status).toBe(200);
    expect(all.body.total).toBe(5);
    expect(all.body.items.map((i: { id: string }) => i.id)).toEqual([
      '1',
      '2',
      '5',
      '6',
      '7',
    ]);

    const page = await supertest(app)
      .get('/api/employees')
      .query({ department: '1', limit: 2, offset: 2 });

    expect(page.body.total).toBe(5);
    expect(page.body.limit).toBe(2);
    expect(page.body.offset).toBe(2);
    expect(page.body.items.map((i: { id: string }) => i.id)).toEqual([
      '5',
      '6',
    ]);

    // Money serialised per contract: amountMinor + currency + exponent, no float
    const ada = all.body.items.find((i: { id: string }) => i.id === '1');
    expect(ada.currentSalary).toEqual({
      amountMinor: 12_000_000,
      currency: 'USD',
      exponent: 2,
    });
  });

  it('defaults to limit 25 and offset 0 over all twelve fixtures', async () => {
    const response = await supertest(app).get('/api/employees');

    expect(response.body.limit).toBe(25);
    expect(response.body.offset).toBe(0);
    expect(response.body.total).toBe(12);
  });
});
