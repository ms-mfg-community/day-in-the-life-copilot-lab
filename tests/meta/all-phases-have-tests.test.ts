import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

// Explicit phase → directory mapping. Each phase must have at least one
// `*.test.ts` file under one of its mapped directories. This makes the
// audit assertion readable from the test name alone.
const PHASE_TEST_DIRS: Record<string, string[]> = {
  'Phase 0 — Foundations & guardrails': [
    'tests/lab-structure',
    'tests/devcontainer',
    'tests/content-currency',
  ],
  'Phase 1 — Currency refresh + marketplace/plugins lab': [
    'tests/plugin-template',
    'tests/content-currency',
  ],
  'Phase 2 — Memory & learning for local environments': [
    'tests/memory',
  ],
  'Phase 3 — Consolidate .NET + add Node/JS parity': [
    'tests/build',
    'node/tests',
  ],
  'Phase 4 — Weekly staleness audit agentic workflow': [
    'tests/workflows',
  ],
  'Phase 5 — Fabric MCP + Fabric notebooks': [
    'tests/mcp-configs',
    'tests/lab-structure',
    'tests/hooks',
  ],
  'Phase 6 — A2A / ACP orchestration + tmux orchestrator pattern': [
    'tests/orchestrator',
    'tests/labs',
  ],
  'Phase 7 — Token optimization & model selection': [
    'tests/prompts',
    'tests/docs',
    'tests/labs',
  ],
};

function listTestFiles(dir: string): string[] {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(abs)) {
    const full = join(abs, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listTestFiles(join(dir, entry)));
    } else if (/\.test\.ts$/.test(entry)) {
      out.push(join(dir, entry));
    }
  }
  return out;
}

describe('meta: every plan phase has at least one test file', () => {
  for (const [phase, dirs] of Object.entries(PHASE_TEST_DIRS)) {
    it(`${phase} has at least one *.test.ts in: ${dirs.join(', ')}`, () => {
      const files = dirs.flatMap((d) => listTestFiles(d));
      expect(
        files.length,
        `no test files found for ${phase} under ${dirs.join(', ')}`,
      ).toBeGreaterThan(0);
    });
  }

  it('Phase 8 — Integration, polish, release has its own meta tests under tests/meta', () => {
    const files = listTestFiles('tests/meta');
    expect(files.length, 'tests/meta must contain at least 2 meta test files').toBeGreaterThanOrEqual(2);
  });

  it('Phase 8 — CHANGELOG.md exists at repo root and names every phase 0–8', () => {
    const path = join(ROOT, 'CHANGELOG.md');
    expect(existsSync(path), 'CHANGELOG.md must be cut as part of Phase 8').toBe(true);
    const text = readFileSync(path, 'utf8');
    for (const n of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(text, `CHANGELOG.md must reference Phase ${n}`).toMatch(new RegExp(`Phase\\s*${n}\\b`));
    }
  });
});
