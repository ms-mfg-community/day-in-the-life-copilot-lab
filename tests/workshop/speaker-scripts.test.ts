import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';

/**
 * Phase 3a — Speaker-script outcome tests.
 *
 * Per `.orchestrator/plan.md` (Phase 2 finding #4), tests stay
 * outcome-based. We do NOT enumerate every module for parity — only
 * the modules owned by the current sub-phase are pinned here. Phase 3b
 * and 3c will extend this list as those modules land.
 *
 * What we assert for each Phase 3a module:
 *
 *   1. The speaker script exists at the path declared below.
 *   2. It contains the six sections called out in `plan.md` line 82:
 *        - "Open with the advanced problem"
 *        - "Demo script"
 *        - "Timing cues"
 *        - "Expected pitfalls"
 *        - "Q&A prompts"
 *        - "Advanced-tip callouts"
 *   3. The timing cues (integer minute markers at line start, e.g.
 *      "- 0:00 …", "- 5:00 …") sum to the `minutes:` value in the
 *      matching slide's YAML front-matter. Last cue's minute value is
 *      the floor of the total — it represents the *start* of the
 *      closing beat, so the module's elapsed time is the last cue's
 *      start minute plus the remaining wrap-up, and total minutes are
 *      encoded as the final `// total: NN min` marker inside the
 *      Timing cues section.
 */

const REPO_ROOT = resolve(__dirname, '..', '..');
const SLIDES_DIR = join(REPO_ROOT, 'workshop', 'slides');
const SCRIPTS_DIR = join(REPO_ROOT, 'workshop', 'speaker-scripts');

interface ModuleSpec {
  id: string;
  slidePath: string;
  scriptPath: string;
}

const PHASE_3A_MODULES: ModuleSpec[] = [
  {
    id: 'M1',
    slidePath: join(SLIDES_DIR, '10-module-1.md'),
    scriptPath: join(SCRIPTS_DIR, 'module-01-extensibility-architecture.md'),
  },
  {
    id: 'M2',
    slidePath: join(SLIDES_DIR, '20-module-2.md'),
    scriptPath: join(SCRIPTS_DIR, 'module-02-mcp.md'),
  },
];

// Phase 3b adds Modules 3 (multi-agent orchestration) and 4 (gh-aw). The
// assertions are identical to Phase 3a — file presence, six required
// sections, and a "total: N min" timing marker that matches the paired
// slide's `minutes:` front-matter. We keep the list additive (do not
// rewrite the Phase 3a list) so the per-phase coverage is auditable.
const PHASE_3B_MODULES: ModuleSpec[] = [
  {
    id: 'M3',
    slidePath: join(SLIDES_DIR, '30-module-3.md'),
    scriptPath: join(SCRIPTS_DIR, 'module-03-multi-agent.md'),
  },
  {
    id: 'M4',
    slidePath: join(SLIDES_DIR, '40-module-4.md'),
    scriptPath: join(SCRIPTS_DIR, 'module-04-gh-aw.md'),
  },
];

// Phase 3c adds Modules 5 (enterprise plugin marketplace, anchor lab11) and
// 6 (A2A / ACP + tmux-orchestrator flagship, anchor labs 13 + 14). Same six
// required sections and a "total: N min" marker matching the slide's
// `minutes:` front-matter. In addition, the flagship shape calls for a
// dense demo script — we assert at least five `### Demo <Letter>` sub-
// sections in the Demo script body so the module carries real live
// material rather than narration-only beats.
const PHASE_3C_MODULES: ModuleSpec[] = [
  {
    id: 'M5',
    slidePath: join(SLIDES_DIR, '50-module-5.md'),
    scriptPath: join(SCRIPTS_DIR, 'module-05-marketplace.md'),
  },
  {
    id: 'M6',
    slidePath: join(SLIDES_DIR, '60-module-6.md'),
    scriptPath: join(SCRIPTS_DIR, 'module-06-a2a-tmux.md'),
  },
];

function countDemoHeadings(script: string): number {
  // Scoped to the Demo script section (## 2.) so advanced-tip or pitfall
  // bullets that happen to include the word "Demo" don't inflate the count.
  const secRe = /##\s+2\.\s+Demo script[\s\S]*?(?=\n##\s+\d\.|\n#\s|$)/i;
  const m = script.match(secRe);
  if (!m) return 0;
  const demoRe = /^###\s+Demo\s+[A-Z]\b/gm;
  return (m[0].match(demoRe) ?? []).length;
}

const REQUIRED_SECTIONS = [
  /##\s+1\.\s+Open with the advanced problem/i,
  /##\s+2\.\s+Demo script/i,
  /##\s+3\.\s+Timing cues/i,
  /##\s+4\.\s+Expected pitfalls/i,
  /##\s+5\.\s+Q&A prompts/i,
  /##\s+6\.\s+Advanced-tip callouts/i,
];

function parseFrontMatterMinutes(slideFile: string): number {
  const raw = readFileSync(slideFile, 'utf8');
  if (!raw.startsWith('---\n')) {
    throw new Error(`no front-matter: ${slideFile}`);
  }
  const end = raw.indexOf('\n---\n', 4);
  const fm = yaml.load(raw.slice(4, end)) as { minutes?: number };
  if (typeof fm.minutes !== 'number') {
    throw new Error(`missing minutes: ${slideFile}`);
  }
  return fm.minutes;
}

function extractTimingCues(script: string): { totalDeclared: number | null; lastStart: number | null } {
  // Grab the "Timing cues" section body.
  const secRe = /##\s+3\.\s+Timing cues[\s\S]*?(?=\n##\s+\d\.|\n#\s|$)/i;
  const m = script.match(secRe);
  if (!m) return { totalDeclared: null, lastStart: null };
  const body = m[0];
  // Lines like "- 0:00 — ..." or "- 12:30 — ..." — capture the minute.
  const cueRe = /^-\s+(\d+):(\d{2})\b/gm;
  let lastStart: number | null = null;
  let cue: RegExpExecArray | null;
  while ((cue = cueRe.exec(body)) !== null) {
    const mins = parseInt(cue[1], 10) + parseInt(cue[2], 10) / 60;
    lastStart = mins;
  }
  // Declared total: a trailing marker "<!-- total: 35 min -->" or
  // "_total: 35 min_" so the author is explicit.
  const totalRe = /total:\s*(\d+)\s*min/i;
  const t = body.match(totalRe);
  const totalDeclared = t ? parseInt(t[1], 10) : null;
  return { totalDeclared, lastStart };
}

describe('workshop speaker-scripts — Phase 3a modules', () => {
  for (const mod of PHASE_3A_MODULES) {
    describe(mod.id, () => {
      it('has a speaker-script file on disk', () => {
        expect(
          existsSync(mod.scriptPath),
          `missing speaker script: ${mod.scriptPath}`,
        ).toBe(true);
      });

      it('contains all six required sections', () => {
        const text = readFileSync(mod.scriptPath, 'utf8');
        for (const re of REQUIRED_SECTIONS) {
          expect(re.test(text), `missing section ${re} in ${mod.scriptPath}`).toBe(true);
        }
      });

      it('declares a total that matches the slide minutes front-matter', () => {
        const slideMinutes = parseFrontMatterMinutes(mod.slidePath);
        const text = readFileSync(mod.scriptPath, 'utf8');
        const { totalDeclared, lastStart } = extractTimingCues(text);
        expect(
          totalDeclared,
          `Timing cues section must declare an explicit "total: N min" marker in ${mod.scriptPath}`,
        ).not.toBeNull();
        expect(totalDeclared).toBe(slideMinutes);
        // Sanity: timing cues must actually be present and monotonic up to the total.
        expect(lastStart, `no timing cues found in ${mod.scriptPath}`).not.toBeNull();
        expect(lastStart! < slideMinutes).toBe(true);
      });
    });
  }
});

describe('workshop speaker-scripts — Phase 3b modules', () => {
  for (const mod of PHASE_3B_MODULES) {
    describe(mod.id, () => {
      it('has a speaker-script file on disk', () => {
        expect(
          existsSync(mod.scriptPath),
          `missing speaker script: ${mod.scriptPath}`,
        ).toBe(true);
      });

      it('contains all six required sections', () => {
        const text = readFileSync(mod.scriptPath, 'utf8');
        for (const re of REQUIRED_SECTIONS) {
          expect(re.test(text), `missing section ${re} in ${mod.scriptPath}`).toBe(true);
        }
      });

      it('declares a total that matches the slide minutes front-matter', () => {
        const slideMinutes = parseFrontMatterMinutes(mod.slidePath);
        const text = readFileSync(mod.scriptPath, 'utf8');
        const { totalDeclared, lastStart } = extractTimingCues(text);
        expect(
          totalDeclared,
          `Timing cues section must declare an explicit "total: N min" marker in ${mod.scriptPath}`,
        ).not.toBeNull();
        expect(totalDeclared).toBe(slideMinutes);
        expect(lastStart, `no timing cues found in ${mod.scriptPath}`).not.toBeNull();
        expect(lastStart! < slideMinutes).toBe(true);
      });
    });
  }
});

describe('workshop speaker-scripts — Phase 3c modules', () => {
  for (const mod of PHASE_3C_MODULES) {
    describe(mod.id, () => {
      it('has a speaker-script file on disk', () => {
        expect(
          existsSync(mod.scriptPath),
          `missing speaker script: ${mod.scriptPath}`,
        ).toBe(true);
      });

      it('contains all six required sections', () => {
        const text = readFileSync(mod.scriptPath, 'utf8');
        for (const re of REQUIRED_SECTIONS) {
          expect(re.test(text), `missing section ${re} in ${mod.scriptPath}`).toBe(true);
        }
      });

      it('declares a total that matches the slide minutes front-matter', () => {
        const slideMinutes = parseFrontMatterMinutes(mod.slidePath);
        const text = readFileSync(mod.scriptPath, 'utf8');
        const { totalDeclared, lastStart } = extractTimingCues(text);
        expect(
          totalDeclared,
          `Timing cues section must declare an explicit "total: N min" marker in ${mod.scriptPath}`,
        ).not.toBeNull();
        expect(totalDeclared).toBe(slideMinutes);
        expect(lastStart, `no timing cues found in ${mod.scriptPath}`).not.toBeNull();
        expect(lastStart! < slideMinutes).toBe(true);
      });

      it('carries at least five "### Demo X" sub-sections inside Demo script', () => {
        const text = readFileSync(mod.scriptPath, 'utf8');
        const count = countDemoHeadings(text);
        expect(
          count,
          `expected >= 5 "### Demo <Letter>" headings in Demo script section of ${mod.scriptPath}, found ${count}`,
        ).toBeGreaterThanOrEqual(5);
      });
    });
  }
});
