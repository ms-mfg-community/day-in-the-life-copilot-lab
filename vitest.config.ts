import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'packaging/core/runtime/{io,release,initialize,profile,copilot,scripts,catalog}.mjs',
        'packaging/core/build/inputs.mjs',
        'packaging/core/verify/lsp-source.mjs',
      ],
      // Process entrypoints/probes are exercised by the real offline container
      // gate; this floor measures the reusable initialization and config logic.
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
});
