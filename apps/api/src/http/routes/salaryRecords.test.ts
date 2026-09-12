import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { testDb } from '../../infrastructure/testing/testDb.js';
import { createContainer } from '../../container.js';
import { createServer } from '../server.js';

const app = createServer(createContainer(testDb));

describe('POST /api/salary-records/:id/corrections', () => {
  it('returns 201 and the replacement record for a live one', async () => {
    // record 1: employee 1's only (live) HIRE record
    const response = await supertest(app)
      .post('/api/salary-records/1/corrections')
      .send({ amountMinor: 12_500_000, currency: 'USD', note: 'typo fix' });

    expect(response.status).toBe(201);
    expect(response.body.amount.amountMinor).toBe(12_500_000);
    expect(response.body.note).toBe('typo fix');
    expect(response.body.changeReason).toBe('HIRE'); // copied, never CORRECTION
  });

  it('returns 422 for an already-corrected record', async () => {
    // record 9: employee 5's MERIT, already superseded by record 10
    const response = await supertest(app)
      .post('/api/salary-records/9/corrections')
      .send({ amountMinor: 16_000_000, currency: 'USD', note: 'trying again' });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('AlreadyCorrectedError');
  });
});
