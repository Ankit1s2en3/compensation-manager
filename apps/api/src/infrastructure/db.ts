import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema.js';

export type Database = PostgresJsDatabase<typeof schema>;

/** A schema-aware drizzle handle plus the raw client to close on shutdown. */
export function makeDb(url: string): {
  client: postgres.Sql;
  db: Database;
} {
  const client = postgres(url);
  return { client, db: drizzle(client, { schema }) };
}

const url = process.env.DATABASE_URL;
if (url === undefined || url === '') {
  throw new Error('DATABASE_URL is not set');
}

export const { client, db } = makeDb(url);
