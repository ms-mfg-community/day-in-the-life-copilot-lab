import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = process.cwd();
const TMUX_START = join(ROOT, 'scripts/orchestrator/tmux-start.sh');
const HANDOFF = join(ROOT, 'scripts/orchestrator/handoff.sh');
const CLEAR = join(ROOT, 'scripts/orchestrator/clear-context.sh');

function tmuxAvailable(): boolean {
  try {
    execFileSync('tmux', ['-V'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

let workdir: string;
let session: string;

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), 'orch-dryrun-'));
  session = `copilot-orch-dryrun-${process.pid}-${Math.floor(Math.random() * 1e6)}`;
});

afterAll(() => {
  if (tmuxAvailable()) {
    try {
      execFileSync('tmux', ['kill-session', '-t', session], { stdio: 'ignore' });
    } catch {
      /* ignore */
    }
  }
  if (workdir) rmSync(workdir, { recursive: true, force: true });
});

describe('orchestrator: end-to-end pattern dry-run', () => {
  it('all three scripts exist and are executable', () => {
    for (const s of [TMUX_START, HANDOFF, CLEAR]) {
      expect(existsSync(s), `expected ${s}`).toBe(true);
      expect((statSync(s).mode & 0o111) !== 0, `${s} must be executable`).toBe(true);
    }
  });

  it.skipIf(!tmuxAvailable())(
    'plan → implement → handoff → clear → qa → clear cycle completes without manual intervention',
    () => {
      // 1. start the orchestrator+worker layout (idempotent, no attach).
      execFileSync('bash', [TMUX_START, '--session', session, '--no-attach'], {
        cwd: ROOT,
        stdio: 'pipe',
      });

      // 2. dev → qa handoff
      const devToQa = execFileSync(
        'bash',
        [
          HANDOFF,
          '6b-dryrun-dev',
          '--out-dir',
          workdir,
          '--input',
          'toy task: add /api/courses?department=…',
          '--output',
          'GREEN tests + impl',
          '--question',
          'none',
          '--accept',
          'tests pass',
        ],
        { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' },
      ).trim();
      expect(existsSync(devToQa)).toBe(true);

      // 3. clear worker context (dry-run: must not require an interactive shell).
      execFileSync(
        'bash',
        [CLEAR, '--session', session, '--pane', 'worker', '--dry-run'],
        { cwd: ROOT, stdio: 'pipe' },
      );

      // 4. qa → dev handoff
      const qaToDev = execFileSync(
        'bash',
        [
          HANDOFF,
          '6b-dryrun-qa',
          '--out-dir',
          workdir,
          '--role',
          'qa',
          '--input',
          'dev artefacts',
          '--output',
          'review verdict',
          '--question',
          'none',
          '--accept',
          'verdict recorded',
        ],
        { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' },
      ).trim();
      expect(existsSync(qaToDev)).toBe(true);

      // 5. clear again
      execFileSync(
        'bash',
        [CLEAR, '--session', session, '--pane', 'worker', '--dry-run'],
        { cwd: ROOT, stdio: 'pipe' },
      );

      // Both handoffs landed in the workspace.
      const docs = readdirSync(workdir).filter((f) => f.endsWith('.md'));
      expect(docs.length, `expected ≥ 2 handoff docs, found ${docs.join(', ')}`).toBeGreaterThanOrEqual(2);

      // Orchestrator session is still alive after the cycle (not killed by clear).
      const live = execFileSync('tmux', ['list-sessions', '-F', '#S'], {
        stdio: 'pipe',
        encoding: 'utf8',
      });
      expect(live.split('\n')).toContain(session);
    },
  );

  it('clear-context.sh dry-run prints the command it would send', () => {
    const out = execFileSync(
      'bash',
      [CLEAR, '--session', 'demo', '--pane', 'worker', '--dry-run'],
      { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' },
    );
    expect(out).toMatch(/\/clear/);
    expect(out).toMatch(/demo/);
  });
});
