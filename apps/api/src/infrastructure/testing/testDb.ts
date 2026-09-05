import { makeDb } from '../db.js';

const url = process.env.TEST_DATABASE_URL;
if (url === undefined || url === '') {
  throw new Error('TEST_DATABASE_URL is not set (run via `npm run test:integration`)');
}

// A handle on compensation_test — never the dev database.
export const { client: testClient, db: testDb } = makeDb(url);
