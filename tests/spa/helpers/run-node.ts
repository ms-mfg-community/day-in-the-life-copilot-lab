// Runs one of the scripts/spa/*.mjs commands as a child process and returns what it did.
//
// The commands are run with `process.execPath` and no shell, so an argument such as `labs/*.md` reaches
// the script as that literal text on every platform, and what is under test is the script's own handling
// of it. Tests spawn the scripts rather than import them: a test that imported the generator would be
// checking the generator's code with the generator's code.
import { spawnSync } from 'node:child_process';

/**
 * Each run is a Node start-up plus a read of the files, and the full suite runs test files in parallel,
 * so a run on a busy machine takes several times as long as on an idle one. Generous, and still finite:
 * a hung script fails the test instead of hanging the suite.
 */
export const SLOW = 60_000;

export interface Run {
  /** The process exit code. A run that ended by timeout or signal throws instead of returning one. */
  status: number;
  stdout: string;
  stderr: string;
}

export function runNode(script: string, args: string[], cwd: string): Run {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', timeout: SLOW });
  if (result.error) throw result.error;
  if (result.status === null) throw new Error(`${script} ended by signal ${String(result.signal)} before it exited`);
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}
