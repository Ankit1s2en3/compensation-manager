import { sql } from 'drizzle-orm';
import { afterAll, beforeEach } from 'vitest';

import { loadFixtures } from './fixtures.js';
import { testClient, testDb } from './testDb.js';

beforeEach(async () => {
  await testDb.execute(sql`
    TRUNCATE salary_records, employees, users, exchange_rates,
             fx_rate_sets, job_levels, departments, currencies
    RESTART IDENTITY CASCADE
  `);
  await loadFixtures(testDb);
});

afterAll(async () => {
  await testClient.end();
});
