import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom + Testing Library arrive with the salary-change form work.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
  },
});
