import { defineConfig } from 'drizzle-kit';

// The schema module lands with the infrastructure layer; drizzle-kit only reads
// it on `generate`. DATABASE_URL is injected from the repo-root .env by the
// npm scripts (package.json: db:generate / db:migrate).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
