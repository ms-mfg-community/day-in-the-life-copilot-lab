import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import matter from 'gray-matter';
import { bashExe, isCommittedExecutable } from '../helpers/platform';

const ROOT = process.cwd();
const BASH = bashExe()!;
const SCRIPT = join(ROOT, 'scripts/orchestrator/handoff.sh');

const REQUIRED_SECTIONS = [
  'phase',
  'inputs',
  'outputs',
  'open_questions',
  'acceptance',
] as const;

let workdir: string;

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), 'orch-handoff-'));
});

afterAll(() => {
  if (workdir) rmSync(workdir, { recursive: true, force: true });
});

describe('orchestrator: handoff.sh writes spec-compliant docs', () => {
  it('script exists and is executable', () => {
    expect(existsSync(SCRIPT), `expected ${SCRIPT}`).toBe(true);
    // Git's recorded mode, not the local filesystem's: NTFS has no exec bit.
    expect(isCommittedExecutable(SCRIPT), 'handoff.sh must be committed 100755').toBe(true);
  });

  it('emits a handoff document at a deterministic path with required schema', () => {
    const phase = '6b-toy';
    const out = execFileSync(
      BASH,
      [
        SCRIPT,
        phase,
        '--out-dir',
        workdir,
        '--input',
        'Lab 13 §B.2 schema',
        '--output',
        'scripts/orchestrator/handoff.sh',
        '--question',
        'Should we couple to .orchestrator/?',
        '--accept',
        'handoff doc has all required sections',
      ],
      { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' },
    ).trim();

    expect(out, 'handoff.sh must print the generated doc path on stdout').toBeTruthy();
    expect(existsSync(out), `generated doc must exist at ${out}`).toBe(true);

    const raw = readFileSync(out, 'utf8');
    const parsed = matter(raw);

    // Frontmatter must declare the phase.
    expect(parsed.data.phase, 'frontmatter.phase must equal CLI arg').toBe(phase);
    expect(parsed.data.role, 'frontmatter.role must be a string').toBeTypeOf('string');
    expect(parsed.data.created_at, 'frontmatter.created_at must be set').toBeTypeOf('string');

    // Each schema section must appear as a heading or frontmatter key.
    for (const section of REQUIRED_SECTIONS) {
      const headingPattern = new RegExp(`^##\\s+.*\\b${section}\\b`, 'mi');
      const hasHeading = headingPattern.test(parsed.content);
      const hasFrontmatter = parsed.data[section] !== undefined;
      expect(
        hasHeading || hasFrontmatter,
        `handoff doc must include "${section}" as a heading or frontmatter key`,
      ).toBe(true);
    }

    // CLI-provided values must be reflected in the doc body.
    expect(parsed.content).toContain('Lab 13 §B.2 schema');
    expect(parsed.content).toContain('scripts/orchestrator/handoff.sh');
    expect(parsed.content).toContain('Should we couple to .orchestrator/?');
    expect(parsed.content).toContain('handoff doc has all required sections');
  });

  it('rejects invocations without a phase argument', () => {
    let threw = false;
    try {
      execFileSync(BASH, [SCRIPT], {
        cwd: ROOT,
        stdio: 'pipe',
        env: { ...process.env, HANDOFF_OUT_DIR: workdir },
      });
    } catch {
      threw = true;
    }
    expect(threw, 'handoff.sh must exit non-zero when no phase is given').toBe(true);
  });
});
