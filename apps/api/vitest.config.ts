import { defineConfig } from 'vitest/config';

// Unit config — no database, ever. Integration tests (infrastructure/, http/)
// have their own config with a globalSetup that runs migrations.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: [
      '**/node_modules/**',
      'src/infrastructure/**',
      'src/http/**',
    ],
    passWithNoTests: true,
  },
});
