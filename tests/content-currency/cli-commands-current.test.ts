import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LABS_DIR = join(process.cwd(), 'labs');

// Phase 1a currency refresh: labs that front-line the Copilot CLI surface
// must teach the current-generation verbs. The registry is the single source
// of truth for model tiers — labs must cross-reference it rather than hardcode.
const TARGET_LABS = [
  'lab01.md',
  'lab05.md',
  'lab07.md',
  'lab08.md',
  'lab09.md',
  'lab10.md',
] as const;

// Each marker: at least one of the patterns must match (case-insensitive).
// Patterns are authored to be teaching-specific — a passing mention is fine,
// but the lab must name the capability explicitly.
const MARKERS: Record<string, RegExp[]> = {
  'plugin install verb': [
    /\/plugin\s+install/i,
    /copilot\s+plugin\s+install/i,
  ],
  '/fleet parallel subagents': [/\/fleet\b/i],
  'plan vs autopilot modes': [
    /plan\s+(?:mode|vs\.?\s+autopilot|and\s+autopilot)/i,
    /autopilot\s+mode/i,
  ],
  'mid-session model switcher referencing registry tiers': [
    /model\s+switch/i,
    /switch(?:ing)?\s+models?\s+mid[- ]session/i,
    /\/model\b/i,
  ],
  'tool discovery via extensions_manage': [
    /extensions_manage/i,
    /tool\s+discovery/i,
  ],
};

describe('content-currency: Phase 1a CLI command coverage', () => {
  for (const lab of TARGET_LABS) {
    const body = readFileSync(join(LABS_DIR, lab), 'utf8');

    describe(lab, () => {
      for (const [label, patterns] of Object.entries(MARKERS)) {
        it(`mentions ${label}`, () => {
          const matched = patterns.some((re) => re.test(body));
          expect(
            matched,
            `${lab} is missing coverage for "${label}" (expected one of: ${patterns
              .map((r) => r.source)
              .join(' | ')})`,
          ).toBe(true);
        });
      }

      it('references the registry for model/version facts (not hardcoded)', () => {
        expect(
          body.includes('docs/_meta/registry.yaml'),
          `${lab} must reference docs/_meta/registry.yaml so model/version facts stay in sync`,
        ).toBe(true);
      });
    });
  }
});
