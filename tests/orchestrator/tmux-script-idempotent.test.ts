import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { bashExe, isCommittedExecutable } from '../helpers/platform';

const ROOT = process.cwd();
const BASH = bashExe()!;
const HARNESS = join(ROOT, 'tests/orchestrator/tmux-script-idempotent.test.sh');

function tmuxAvailable(): boolean {
  try {
    execFileSync('tmux', ['-V'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('orchestrator: tmux-start.sh idempotency', () => {
  it('bash harness exists and is executable', () => {
    expect(existsSync(HARNESS), `expected ${HARNESS}`).toBe(true);
    // Git's recorded mode, not the local filesystem's: NTFS has no exec bit.
    expect(isCommittedExecutable(HARNESS), 'harness must be committed 100755').toBe(true);
  });

  it.skipIf(!tmuxAvailable())(
    'running tmux-start.sh twice does not double-spawn (bash harness)',
    () => {
      const out = execFileSync(BASH, [HARNESS], {
        cwd: ROOT,
        stdio: 'pipe',
        encoding: 'utf8',
      });
      expect(out).toMatch(/PASS|SKIP/);
    },
  );
});
