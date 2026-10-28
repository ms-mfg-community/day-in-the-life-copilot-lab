/**
 * Cross-platform helpers for the test suite.
 *
 * The suite was written on Linux and assumed three things that are false on
 * Windows, which made 45 assertions fail on the maintainer's own machine and
 * left `npm test` useless as a gate:
 *
 *   1. A shell script can be spawned directly.  Windows has no shebang
 *      support, so `spawnSync('/path/to/x.sh')` fails with EFTYPE/ENOENT.
 *   2. `/usr/bin/bash` exists.  On Windows the usable POSIX shell is Git
 *      Bash, and WSL's `bash.exe` mangles Windows absolute paths.
 *   3. The filesystem carries an executable bit.  NTFS does not, so
 *      `statSync(p).mode & 0o111` is always 0 no matter what Git records.
 *
 * These helpers fix the mechanism without weakening any assertion.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';

export const IS_WINDOWS = process.platform === 'win32';

const WINDOWS_BASH_CANDIDATES = [
  'C:\\Program Files\\Git\\bin\\bash.exe',
  'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
];

/**
 * Absolute path to a POSIX shell that understands this platform's absolute
 * paths. Git Bash is required on Windows: WSL's `bash.exe` receives
 * `C:\a\b` and resolves it as the relative path `C:ab`.
 */
export function bashExe(): string | null {
  if (!IS_WINDOWS) return '/usr/bin/bash';
  return WINDOWS_BASH_CANDIDATES.find((p) => existsSync(p)) ?? null;
}

export const HAS_BASH = bashExe() !== null;

/** True when `name` is runnable on PATH. Used to skip tests whose dependency is absent. */
export function hasCommand(name: string): boolean {
  // Through a shell on every platform: `command` is a shell builtin, so spawned directly it is ENOENT and every
  // dependency reads as absent (the jq assertions skipped on Linux CI with jq installed).
  const probe = IS_WINDOWS ? ['where', name] : ['command', '-v', name];
  const res = spawnSync(probe[0], probe.slice(1), { stdio: 'ignore', shell: true });
  return res.status === 0;
}

/** Run a shell script through bash, which works identically on all platforms. */
export function runScript(
  scriptPath: string,
  args: string[] = [],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; input?: string } = {},
) {
  const bash = bashExe();
  if (bash === null) throw new Error('no POSIX shell available');
  const res = spawnSync(bash, [scriptPath, ...args], {
    encoding: 'utf8',
    cwd: opts.cwd,
    env: opts.env,
    input: opts.input,
  });
  return {
    status: res.status ?? -1,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
}

/**
 * Run a shell script and throw if it exits non-zero, mirroring the
 * `execFileSync(script, args)` calls this replaces. Windows cannot execute a
 * shebang script directly, so the interpreter is always explicit.
 */
export function execScript(
  scriptPath: string,
  args: string[] = [],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): string {
  const bash = bashExe();
  if (bash === null) throw new Error('no POSIX shell available');
  return execFileSync(bash, [scriptPath, ...args], {
    stdio: 'pipe',
    encoding: 'utf8',
    cwd: opts.cwd,
    env: opts.env,
  });
}

/** Same, for a Node script with a `#!/usr/bin/env node` shebang. */
export function execNodeScript(
  scriptPath: string,
  args: string[] = [],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {},
): string {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    stdio: 'pipe',
    encoding: 'utf8',
    cwd: opts.cwd,
    env: opts.env,
    timeout: opts.timeout,
  });
}

/**
 * True when Git records the file as mode 100755.
 *
 * This is the property that actually matters and the one the original
 * assertions meant to test: the executable bit must be *committed*, so that
 * CI and anyone cloning on Linux or macOS gets a runnable script. Reading the
 * local filesystem mode tests the checkout instead, which on Windows can
 * never be true.
 */
export function isCommittedExecutable(absPath: string, repoRoot = process.cwd()): boolean {
  const rel = relative(repoRoot, resolve(absPath)).split('\\').join('/');
  const out = execFileSync('git', ['ls-files', '-s', '--', rel], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  if (out === '') throw new Error(`not tracked by git: ${rel}`);
  return out.startsWith('100755');
}

/**
 * Split YAML front matter from a markdown document, tolerating CRLF.
 *
 * Markdown may legally use either line ending, and Git hands Windows users
 * CRLF under `core.autocrlf=true`, so parsers must not hardcode `\n`.
 * Returns null when the document has no front matter.
 */
export function splitFrontMatter(raw: string): { body: string; yaml: string } | null {
  const text = raw.replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return null;
  return { yaml: text.slice(4, end), body: text.slice(end + 5) };
}
