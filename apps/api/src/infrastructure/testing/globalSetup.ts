import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Runs once before the integration suite: bring compensation_test up to the
 * latest migration. Uses the drizzle-orm runtime migrator so there is no CLI
 * subprocess — it reads the same drizzle/ folder as `npm run db:migrate`.
 */
export async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (url === undefined || url === '') {
    throw new Error(
      'TEST_DATABASE_URL is not set (run via `npm run test:integration`)',
    );
  }

  const client = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
  } finally {
    await client.end();
  }
}
