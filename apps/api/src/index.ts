import path from 'node:path';

import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { createContainer } from './container.js';
import { db } from './infrastructure/db.js';
import { loadJwtSecret } from './infrastructure/jwtSecret.js';
import { createServer } from './http/server.js';

// Fail fast, before a single request is accepted. DATABASE_URL is already
// checked as a side effect of importing infrastructure/db.js above — it
// throws at that import if unset. JWT_SECRET is checked explicitly here: a
// boot crash with a clear message beats a running app with a guessable key.
const jwtSecret = loadJwtSecret();

// apps/api/drizzle — a sibling of src/ (dev) or dist/ (prod), so this is
// independent of process.cwd() regardless of how the container is invoked.
const migrationsFolder = path.join(import.meta.dirname, '..', 'drizzle');

const before = await appliedMigrationCount();
await migrate(db, { migrationsFolder });
const after = await appliedMigrationCount();
console.log(
  `migrations: ${after - before} applied this run, ${after} total`,
);

const port = Number(process.env.PORT ?? 3000);
const app = createServer(createContainer(db, jwtSecret), jwtSecret);

// A container bound to localhost/127.0.0.1 gets no traffic — the platform
// connects from outside the container's network namespace.
app.listen(port, '0.0.0.0', () => {
  console.log(`compensation-manager api listening on :${port}`);
});

async function appliedMigrationCount(): Promise<number> {
  try {
    const rows = (await db.execute(
      sql`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`,
    )) as unknown as Array<{ count: number }>;
    return rows[0]?.count ?? 0;
  } catch {
    // Schema/table doesn't exist yet — a brand new database, nothing applied.
    return 0;
  }
}
