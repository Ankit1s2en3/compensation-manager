import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { testDb } from '../../infrastructure/testing/testDb.js';
import { createContainer } from '../container.js';
import { createServer } from '../server.js';

const app = createServer(createContainer(testDb));

describe('GET /health', () => {
  it('returns 200 without touching the database', async () => {
    const response = await supertest(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
