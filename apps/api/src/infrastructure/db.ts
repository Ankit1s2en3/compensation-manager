import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema.js';

const url = process.env.DATABASE_URL;
if (url === undefined || url === '') {
  throw new Error('DATABASE_URL is not set');
}

/** Raw postgres.js client. Close it with `client.end()` on shutdown. */
export const client = postgres(url);

/** Drizzle handle, schema-aware. */
export const db = drizzle(client, { schema });
