import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema.js';

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * A schema-aware drizzle handle plus the raw client to close on shutdown.
 *
 * Deliberately no `ssl` option passed to `postgres()`. Left unset, postgres.js
 * parses `sslmode` out of the connection string itself and uses it — Neon's
 * connection strings carry `?sslmode=require`, so production gets SSL for
 * free; local Postgres's URL carries no sslmode, so it stays plaintext.
 * Passing `ssl: false` here "to be safe" would silently break Neon instead —
 * it overrides the parsed sslmode rather than falling back to it.
 */
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
