import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // Scaffold has no tests yet; `npm test` must still exit 0.
    passWithNoTests: true,
  },
});
