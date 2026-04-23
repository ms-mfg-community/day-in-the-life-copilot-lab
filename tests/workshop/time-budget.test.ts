import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Phase 1 — Curriculum time budget.
 *
 * `workshop/curriculum.md` carries a single machine-parseable YAML block
 * between the markers:
 *
 *   <!-- time-budget:start -->
 *   ```yaml
 *   total_minutes: 240
 *   contingency_minimum_pct: 15
 *   modules:
 *     - id: M1
 *       minutes: 35
 *       ...
 *   overhead:
 *     opening_min: 5
 *     break_min: 20
 *     qa_min: 15
 *     contingency_min: 40
 *   ```
 *   <!-- time-budget:end -->
 *
 * Invariants enforced here (the 4-hour ceiling and the ≥15% contingency
 * floor from plan.md → Phase 1):
 *
 *   sum(module minutes) + opening + break + qa + contingency == total_minutes
 *   total_minutes == 240
 *   contingency_min / total_minutes >= 0.15
 *   5 <= modules.length <= 6      (per plan: "5–6 modules, not 9")
 *
 * Also cross-checks that every module's anchor-labs are real lab IDs
 * present in docs/_meta/registry.yaml so the curriculum cannot drift
 * from the lab surface.
 */

const ROOT = process.cwd();
const CURRICULUM = join(ROOT, 'workshop', 'curriculum.md');
const REGISTRY = join(ROOT, 'docs', '_meta', 'registry.yaml');
const SLIDES_DIR = join(ROOT, 'workshop', 'slides');

interface Module {
  id: string;
  title: string;
  minutes: number;
  anchor_labs?: string[];
}

interface Overhead {
  opening_min: number;
  break_min: number;
  qa_min: number;
  contingency_min: number;
}

interface TimeBudget {
  total_minutes: number;
  contingency_minimum_pct: number;
  modules: Module[];
  overhead: Overhead;
}

function extractTimeBudget(md: string): TimeBudget {
  const start = md.indexOf('<!-- time-budget:start -->');
  const end = md.indexOf('<!-- time-budget:end -->');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      'curriculum.md must contain <!-- time-budget:start --> ... <!-- time-budget:end --> markers',
    );
  }
  const block = md.slice(start, end);
  const fenceMatch = block.match(/```ya?ml\s+([\s\S]*?)```/);
  if (!fenceMatch) {
    throw new Error('time-budget markers must wrap a fenced ```yaml ... ``` block');
  }
  return yaml.load(fenceMatch[1]) as TimeBudget;
}

describe('workshop time budget (curriculum.md)', () => {
  let budget: TimeBudget;
  let registryLabIds: Set<string>;

  beforeAll(() => {
    const md = readFileSync(CURRICULUM, 'utf8');
    budget = extractTimeBudget(md);
    const registry = yaml.load(readFileSync(REGISTRY, 'utf8')) as {
      labs: Record<string, unknown>;
    };
    registryLabIds = new Set(Object.keys(registry.labs));
  });

  it('declares a 240-minute (4-hour) total', () => {
    expect(budget.total_minutes).toBe(240);
  });

  it('sums modules + overhead exactly to total_minutes', () => {
    const moduleSum = budget.modules.reduce((acc, m) => acc + m.minutes, 0);
    const { opening_min, break_min, qa_min, contingency_min } = budget.overhead;
    const grandTotal = moduleSum + opening_min + break_min + qa_min + contingency_min;
    expect(grandTotal).toBe(budget.total_minutes);
  });

  it('reserves at least 15% contingency (>= 36 min on a 240-min budget)', () => {
    const pct = (budget.overhead.contingency_min / budget.total_minutes) * 100;
    expect(pct).toBeGreaterThanOrEqual(15);
    expect(budget.overhead.contingency_min).toBeGreaterThanOrEqual(36);
  });

  it('declares the documented contingency floor (>= 15%)', () => {
    expect(budget.contingency_minimum_pct).toBeGreaterThanOrEqual(15);
  });

  it('has between 5 and 6 modules (plan: "5–6 modules, not 9")', () => {
    expect(budget.modules.length).toBeGreaterThanOrEqual(5);
    expect(budget.modules.length).toBeLessThanOrEqual(6);
  });

  it('every module has a positive integer minutes value', () => {
    for (const m of budget.modules) {
      expect(m.minutes, `module ${m.id} minutes`).toBeTypeOf('number');
      expect(Number.isInteger(m.minutes), `module ${m.id} minutes integer`).toBe(true);
      expect(m.minutes, `module ${m.id} minutes > 0`).toBeGreaterThan(0);
    }
  });

  it('module ids are unique', () => {
    const ids = budget.modules.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every anchor_labs entry exists in docs/_meta/registry.yaml', () => {
    for (const m of budget.modules) {
      for (const labId of m.anchor_labs ?? []) {
        expect(
          registryLabIds.has(labId),
          `module ${m.id} anchors unknown lab ${labId}`,
        ).toBe(true);
      }
    }
  });

  it('total content minutes stays within the plan ceiling (<= 165 min)', () => {
    const moduleSum = budget.modules.reduce((acc, m) => acc + m.minutes, 0);
    expect(moduleSum).toBeLessThanOrEqual(165);
  });
});

describe('registry workshop-pace audit', () => {
  let registry: {
    labs: Record<
      string,
      { pace_presenter_minutes: number; pace_workshop_minutes?: number }
    >;
  };

  beforeAll(() => {
    registry = yaml.load(readFileSync(REGISTRY, 'utf8')) as typeof registry;
  });

  it('every lab declares pace_workshop_minutes for realistic presenter demos', () => {
    for (const [id, lab] of Object.entries(registry.labs)) {
      expect(
        lab.pace_workshop_minutes,
        `${id} must declare pace_workshop_minutes for workshop module timing`,
      ).toBeTypeOf('number');
      expect(lab.pace_workshop_minutes!).toBeGreaterThan(0);
    }
  });

  it('pace_workshop_minutes >= pace_presenter_minutes (workshop demo is never faster than a fly-by)', () => {
    for (const [id, lab] of Object.entries(registry.labs)) {
      expect(
        lab.pace_workshop_minutes!,
        `${id} workshop pace must be >= fly-by pace`,
      ).toBeGreaterThanOrEqual(lab.pace_presenter_minutes);
    }
  });
});

/**
 * Phase 3b regression — slide front-matter `minutes` must match the
 * curriculum time-budget entry for the same module id.
 *
 * This closes the hole QA caught in Phase 3b: the speaker-script test
 * only compared the `<!-- total: N min -->` marker against the slide's
 * own `minutes:` front-matter, so a slide that declared `minutes: 30`
 * while curriculum said `minutes: 25` still passed locally. The
 * authoritative source is `workshop/curriculum.md`; slides and
 * speaker-script totals must conform to it.
 */
describe('workshop slide front-matter vs curriculum', () => {
  let budget: TimeBudget;
  let curriculumMinutesById: Map<string, number>;

  beforeAll(() => {
    budget = extractTimeBudget(readFileSync(CURRICULUM, 'utf8'));
    curriculumMinutesById = new Map(budget.modules.map((m) => [m.id, m.minutes]));
  });

  function slideFrontMatter(file: string): { module?: string; minutes?: number } {
    const raw = readFileSync(file, 'utf8');
    if (!raw.startsWith('---\n')) return {};
    const end = raw.indexOf('\n---\n', 4);
    if (end === -1) return {};
    return yaml.load(raw.slice(4, end)) as { module?: string; minutes?: number };
  }

  const moduleSlideFiles = readdirSync(SLIDES_DIR)
    .filter((f) => /^\d+-module-\d+\.md$/.test(f))
    .sort();

  it('discovers at least one module slide deck', () => {
    expect(moduleSlideFiles.length).toBeGreaterThan(0);
  });

  for (const file of moduleSlideFiles) {
    it(`${file} minutes matches curriculum.md for its module id`, () => {
      const fm = slideFrontMatter(join(SLIDES_DIR, file));
      expect(fm.module, `${file} missing front-matter 'module:'`).toBeTypeOf('string');
      expect(fm.minutes, `${file} missing front-matter 'minutes:'`).toBeTypeOf('number');
      const expected = curriculumMinutesById.get(fm.module!);
      expect(
        expected,
        `${file} declares module ${fm.module} but curriculum has no such module`,
      ).toBeTypeOf('number');
      expect(
        fm.minutes,
        `${file} front-matter minutes=${fm.minutes} must match curriculum.md ${fm.module}=${expected}`,
      ).toBe(expected);
    });
  }
});
