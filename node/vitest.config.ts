import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // App code only — exclude entry points, one-shot scripts, view templates,
      // and test config from the line-coverage floor. These are validated by
      // E2E (Playwright) or executed manually, not by vitest unit/integration
      // tests.
      include: ['core/**/*.ts', 'infra/**/*.ts', 'web/**/*.ts'],
      exclude: [
        'web/server.ts',
        'web/views/**',
        'infra/seed.ts',
        'playwright.config.ts',
        'vitest.config.ts',
        '**/*.d.ts',
      ],
    },
  },
});

