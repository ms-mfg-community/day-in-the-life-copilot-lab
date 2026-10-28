import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // A lab's contract test is written RED, before the lab is edited, and is parked
    // here until that lab's pass starts. Without this the whole wave's red tests
    // would sink `npm test` for every lab, making AC1 meaningless.
    // See specs/labs/README.md, "Pending contract tests".
    exclude: [...configDefaults.exclude, 'tests/lab-structure/pending/**'],
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
