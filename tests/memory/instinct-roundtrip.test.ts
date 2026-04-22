import { describe, it, expect } from 'vitest';
import {
  exportInstinct,
  importInstinct,
  type InstinctBundle,
} from '../../scripts/memory/instinct-roundtrip.js';

const FIXTURE = `---
id: roundtrip-fixture
trigger: "when validating instinct export/import"
confidence: 0.85
domain: "testing"
source: "fixture"
created: "2026-04-22"
---

# Roundtrip Fixture

## Action
Round-trip exports of an instinct must preserve confidence and all
frontmatter keys exactly, otherwise teams sharing instincts via
\`/instinct-export\` and \`/instinct-import\` would silently drift.

## Evidence
- Phase 2 plan.md: "export → import of an instinct preserves confidence score".
`;

describe('memory: instinct export/import round-trip', () => {
  it('exports an instinct markdown file to a structured bundle', () => {
    const bundle = exportInstinct(FIXTURE);

    expect(bundle.id).toBe('roundtrip-fixture');
    expect(bundle.confidence).toBe(0.85);
    expect(bundle.frontmatter.trigger).toBe(
      'when validating instinct export/import',
    );
    expect(bundle.body).toMatch(/Roundtrip Fixture/);
  });

  it('round-trips through export → import preserving confidence', () => {
    const bundle: InstinctBundle = exportInstinct(FIXTURE);
    const reSerialized = importInstinct(bundle);
    const reParsed = exportInstinct(reSerialized);

    expect(reParsed.confidence).toBe(0.85);
    expect(reParsed.id).toBe(bundle.id);
    expect(reParsed.frontmatter.domain).toBe('testing');
    expect(reParsed.body.trim()).toBe(bundle.body.trim());
  });

  it('rejects bundles missing a numeric confidence (guards silent drift)', () => {
    const broken = `---
id: no-confidence
trigger: "when confidence is missing"
domain: "testing"
---

body
`;
    expect(() => exportInstinct(broken)).toThrowError(/confidence/);
  });

  it('preserves confidence at the boundary values 0 and 1', () => {
    for (const c of [0, 0.3, 0.9, 1]) {
      const md = `---\nid: edge-${c}\ntrigger: "edge"\nconfidence: ${c}\ndomain: "testing"\n---\n\nbody\n`;
      const round = exportInstinct(importInstinct(exportInstinct(md)));
      expect(round.confidence).toBe(c);
    }
  });
});
