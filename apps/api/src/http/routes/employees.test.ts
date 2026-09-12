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

describe('GET /api/employees/:id', () => {
  it('returns the profile with the timeline, superseded records flagged', async () => {
    // employee 5 has a correction: #9 (MERIT) superseded by #10 (MERIT)
    const response = await supertest(app).get('/api/employees/5');

    expect(response.status).toBe(200);
    expect(response.body.employee.id).toBe('5');
    expect(response.body.currentRecord.id).toBe('10');
    expect(response.body.currentRecord.amount).toEqual({
      amountMinor: 17_200_000,
      currency: 'USD',
      exponent: 2,
    });

    const byId = new Map(
      response.body.history.map((h: { record: { id: string } }) => [
        h.record.id,
        h,
      ]),
    );
    expect(byId.get('9')).toMatchObject({
      isSuperseded: true,
      isCurrent: false,
    });
    expect(byId.get('10')).toMatchObject({
      isSuperseded: false,
      isCurrent: true,
    });
  });

  it('returns 404 for an unknown id', async () => {
    const response = await supertest(app).get('/api/employees/999999');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('EmployeeNotFoundError');
  });
});

describe('POST /api/employees/:id/salary-changes', () => {
  it('returns 201 and the new record', async () => {
    // employee 1: single HIRE, $120,000, effective 2024-01-01, open
    const response = await supertest(app)
      .post('/api/employees/1/salary-changes')
      .send({
        amountMinor: 13_000_000,
        currency: 'USD',
        effectiveFrom: '2026-06-01',
        changeReason: 'MERIT',
        note: null,
      });

    expect(response.status).toBe(201);
    expect(response.body.amount).toEqual({
      amountMinor: 13_000_000,
      currency: 'USD',
      exponent: 2,
    });
    expect(response.body.changeReason).toBe('MERIT');
    expect(response.body.effectiveFrom).toBe('2026-06-01');
  });

  it('returns 422 with the domain error code for a retroactive date', async () => {
    const response = await supertest(app)
      .post('/api/employees/1/salary-changes')
      .send({
        amountMinor: 13_000_000,
        currency: 'USD',
        // same day as the HIRE record's effective_from — must be strictly after (I8)
        effectiveFrom: '2024-01-01',
        changeReason: 'MERIT',
        note: null,
      });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('RetroactiveChangeError');
  });

  it('returns 400 when effectiveFrom is missing', async () => {
    const response = await supertest(app)
      .post('/api/employees/1/salary-changes')
      .send({
        amountMinor: 13_000_000,
        currency: 'USD',
        changeReason: 'MERIT',
        note: null,
      });

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.effectiveFrom).toBeDefined();
  });
});
