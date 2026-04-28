import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Phase 4 — Three-artefact split + timing plan + handout-pdf target.
 *
 * Asserts that the Phase 4 deliverables exist and stay aligned to
 * `workshop/curriculum.md` (guarded, authoritative for minutes).
 *
 *   - workshop/timing-plan.md          single-source 4-hour pacing plan
 *   - workshop/facilitator-guide.md    presenter-facing playbook
 *   - workshop/attendee-preread.md     before-the-workshop read
 *   - workshop/attendee-handout.md     mid-workshop/takeaway reference
 *   - Makefile `handout-pdf` target    pandoc-backed, opt-in
 *
 * Minutes in timing-plan.md must echo curriculum.md per-module and sum
 * to the 240-minute total. We parse a machine-readable YAML block from
 * timing-plan.md (markers `<!-- timing-plan:start -->` / `:end -->`)
 * for deterministic cross-check.
 */

const ROOT = process.cwd();
const WORKSHOP = join(ROOT, 'workshop');
const CURRICULUM = join(WORKSHOP, 'curriculum.md');
const TIMING_PLAN = join(WORKSHOP, 'timing-plan.md');
const FACILITATOR = join(WORKSHOP, 'facilitator-guide.md');
const PREREAD = join(WORKSHOP, 'attendee-preread.md');
const HANDOUT = join(WORKSHOP, 'attendee-handout.md');
const MAKEFILE = join(ROOT, 'Makefile');

interface Module {
  id: string;
  title: string;
  minutes: number;
}
interface Overhead {
  opening_min: number;
  break_min: number;
  qa_min: number;
  contingency_min: number;
}
interface TimeBudget {
  total_minutes: number;
  modules: Module[];
  overhead: Overhead;
}

function extractYamlBlock(md: string, startMarker: string, endMarker: string): string {
  const start = md.indexOf(startMarker);
  const end = md.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`missing ${startMarker} ... ${endMarker} markers`);
  }
  const block = md.slice(start, end);
  const fence = block.match(/```ya?ml\s+([\s\S]*?)```/);
  if (!fence) throw new Error(`markers ${startMarker} must wrap a fenced yaml block`);
  return fence[1];
}

function curriculumBudget(): TimeBudget {
  const md = readFileSync(CURRICULUM, 'utf8');
  return yaml.load(
    extractYamlBlock(md, '<!-- time-budget:start -->', '<!-- time-budget:end -->'),
  ) as TimeBudget;
}

interface TimingEntry {
  id: string;
  minutes: number;
}
interface TimingPlan {
  total_minutes: number;
  schedule: TimingEntry[];
}

function timingPlan(): TimingPlan {
  const md = readFileSync(TIMING_PLAN, 'utf8');
  return yaml.load(
    extractYamlBlock(md, '<!-- timing-plan:start -->', '<!-- timing-plan:end -->'),
  ) as TimingPlan;
}

describe('Phase 4 — artefact existence', () => {
  it('workshop/timing-plan.md exists', () => {
    expect(existsSync(TIMING_PLAN)).toBe(true);
  });
  it('workshop/facilitator-guide.md exists', () => {
    expect(existsSync(FACILITATOR)).toBe(true);
  });
  it('workshop/attendee-preread.md exists', () => {
    expect(existsSync(PREREAD)).toBe(true);
  });
  it('workshop/attendee-handout.md exists', () => {
    expect(existsSync(HANDOUT)).toBe(true);
  });
});

describe('Phase 4 — timing-plan.md aligns with curriculum.md', () => {
  let budget: TimeBudget;
  let plan: TimingPlan;

  beforeAll(() => {
    budget = curriculumBudget();
    plan = timingPlan();
  });

  it('declares total_minutes = 240 (matches curriculum)', () => {
    expect(plan.total_minutes).toBe(240);
    expect(plan.total_minutes).toBe(budget.total_minutes);
  });

  it('schedule entry minutes sum to total_minutes', () => {
    const sum = plan.schedule.reduce((a, e) => a + e.minutes, 0);
    expect(sum).toBe(plan.total_minutes);
  });

  it('every curriculum module appears in the schedule with matching minutes', () => {
    const byId = new Map(plan.schedule.map((e) => [e.id, e.minutes]));
    for (const m of budget.modules) {
      expect(byId.has(m.id), `timing-plan missing module ${m.id}`).toBe(true);
      expect(
        byId.get(m.id),
        `timing-plan ${m.id}=${byId.get(m.id)} must match curriculum ${m.id}=${m.minutes}`,
      ).toBe(m.minutes);
    }
  });

  it('schedule includes opening, breaks, Q&A, and contingency buckets', () => {
    const ids = new Set(plan.schedule.map((e) => e.id));
    for (const required of ['opening', 'break', 'qa', 'contingency']) {
      expect(ids.has(required), `timing-plan schedule missing "${required}" entry`).toBe(true);
    }
  });
});

describe('Phase 4 — attendee-preread.md required sections', () => {
  let md: string;
  beforeAll(() => {
    md = readFileSync(PREREAD, 'utf8');
  });

  it('has a Prework section', () => {
    expect(/^##\s+Prework\b/m.test(md)).toBe(true);
  });
  it('has a Pace section', () => {
    expect(/^##\s+Pace\b/m.test(md)).toBe(true);
  });
  it('has an Expectations section', () => {
    expect(/^##\s+Expectations\b/m.test(md)).toBe(true);
  });
  it('references the README prework checklist', () => {
    expect(md).toMatch(/README\.md/);
  });
});

describe('Phase 4 — attendee-handout.md required sections', () => {
  let md: string;
  beforeAll(() => {
    md = readFileSync(HANDOUT, 'utf8');
  });

  it('has a Module cards section', () => {
    expect(/^##\s+Module cards\b/m.test(md)).toBe(true);
  });
  it('has a Troubleshooting section', () => {
    expect(/^##\s+Troubleshooting\b/m.test(md)).toBe(true);
  });
  it('references every curriculum module id (M1..M6)', () => {
    const budget = curriculumBudget();
    for (const m of budget.modules) {
      expect(md.includes(m.id), `handout missing module id ${m.id}`).toBe(true);
    }
  });
});

describe('Phase 4 — facilitator-guide.md required sections', () => {
  let md: string;
  beforeAll(() => {
    md = readFileSync(FACILITATOR, 'utf8');
  });

  it('has a Cue summary section', () => {
    expect(/^##\s+Cue summary\b/m.test(md)).toBe(true);
  });
  it('has a Contingency section', () => {
    expect(/^##\s+Contingency\b/m.test(md)).toBe(true);
  });
  it('references every speaker script file (module-01..06)', () => {
    const expected = [
      'module-01-extensibility-architecture.md',
      'module-02-mcp.md',
      'module-03-multi-agent.md',
      'module-04-gh-aw.md',
      'module-05-marketplace.md',
      'module-06-a2a-tmux.md',
    ];
    for (const f of expected) {
      expect(md.includes(f), `facilitator-guide must reference ${f}`).toBe(true);
    }
  });
});

describe('Phase 4 — Makefile handout-pdf target', () => {
  let makefile: string;
  beforeAll(() => {
    makefile = readFileSync(MAKEFILE, 'utf8');
  });

  it('declares handout-pdf as a .PHONY target', () => {
    const phony = makefile.match(/^\.PHONY:\s+(.+)$/m);
    expect(phony, 'Makefile must declare .PHONY').not.toBeNull();
    expect(phony![1].split(/\s+/)).toContain('handout-pdf');
  });

  it('defines a handout-pdf recipe', () => {
    expect(/^handout-pdf:/m.test(makefile)).toBe(true);
  });

  it('handout-pdf recipe mentions pandoc (opt-in dependency)', () => {
    const recipe = makefile.match(/^handout-pdf:[^\n]*\n((?:\t[^\n]*\n?)+)/m);
    expect(recipe, 'handout-pdf recipe body missing').not.toBeNull();
    expect(recipe![1]).toMatch(/pandoc/i);
  });
});
