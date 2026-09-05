import { defineConfig } from 'vitest/config';

// Integration config — hits the real Postgres (TEST_DATABASE_URL). Run via
// `npm run test:integration`, which loads .env with dotenv-cli.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/infrastructure/**/*.test.ts', 'src/http/**/*.test.ts'],
    globalSetup: ['src/infrastructure/testing/globalSetup.ts'],
    setupFiles: ['src/infrastructure/testing/setup.ts'],
    // One database, TRUNCATEd between tests — files must not run in parallel.
    fileParallelism: false,
    passWithNoTests: true,
  },
});
