import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, chmodSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Phase 0 — Attendee readiness.
 *
 * The preflight script classifies environment issues as FAIL (blocks the
 * workshop / Lab 14) or WARN (degraded but workable). Tests exercise the
 * Bash implementation by stubbing tool availability via a scratch PATH and
 * overriding OS / repo-path detection through documented env hooks:
 *
 *   PREFLIGHT_OS        linux|darwin|wsl2|wsl1|windows
 *   PREFLIGHT_REPO_PATH absolute path used for "repo on /mnt/c/" check
 *
 * These hooks exist specifically so this suite can test classification
 * behaviour deterministically without a real Windows / WSL1 host.
 */

const ROOT = process.cwd();
const SH = join(ROOT, 'scripts', 'preflight.sh');
const PS1 = join(ROOT, 'scripts', 'preflight.ps1');

const REQUIRED_TOOLS = ['git', 'gh', 'copilot', 'node', 'tmux', 'docker'];

function makeStubPath(tools: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'preflight-stub-'));
  for (const t of tools) {
    const p = join(dir, t);
    // Stubs use /bin/sh so they work even when PATH is limited to the
    // stub directory (no `env` / `bash` lookup required).
    const body =
      t === 'node'
        ? '#!/bin/sh\necho v20.11.0\n'
        : t === 'gh'
        ? '#!/bin/sh\nif [ "$1" = "extension" ] && [ "$2" = "list" ]; then echo "github/gh-aw"; exit 0; fi\necho "gh stub $*"\n'
        : `#!/bin/sh\necho "${t} stub $*"\n`;
    writeFileSync(p, body);
    chmodSync(p, 0o755);
  }
  return dir;
}

function runPreflight(
  args: string[],
  opts: {
    toolDir?: string;
    env?: Record<string, string | undefined>;
    includeSystemPath?: boolean;
  } = {},
) {
  const baseEnv: Record<string, string | undefined> = {
    ...process.env,
    ...opts.env,
  };
  // Isolate from the host's real tool set unless the caller opts in.
  if (opts.toolDir !== undefined) {
    baseEnv.PATH = opts.includeSystemPath
      ? `${opts.toolDir}:/usr/bin:/bin`
      : opts.toolDir;
  }
  const res = spawnSync('/usr/bin/bash', [SH, ...args], {
    env: baseEnv as NodeJS.ProcessEnv,
    encoding: 'utf8',
  });
  return {
    status: res.status ?? -1,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
}

function parseJson(stdout: string): {
  checks: Array<{ id: string; status: 'pass' | 'warn' | 'fail'; message?: string; remediation?: string }>;
  fails: number;
  warns: number;
  os?: string;
  lab14?: boolean;
} {
  const trimmed = stdout.trim();
  return JSON.parse(trimmed);
}

describe('scripts/preflight — files exist and are executable', () => {
  it('preflight.sh exists and is executable', () => {
    expect(existsSync(SH)).toBe(true);
    const mode = statSync(SH).mode;
    // executable by owner
    expect(mode & 0o100).toBeTruthy();
  });

  it('preflight.ps1 exists', () => {
    expect(existsSync(PS1)).toBe(true);
  });
});

describe('scripts/preflight.sh — CLI surface', () => {
  it('--help prints usage with fail-vs-warn vocabulary', () => {
    const r = runPreflight(['--help']);
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toMatch(/preflight/i);
    expect(r.stdout + r.stderr).toMatch(/--lab14/);
    expect(r.stdout + r.stderr).toMatch(/--json/);
  });

  it('--json emits a parseable JSON object with checks[], fails, warns', () => {
    const stub = makeStubPath(REQUIRED_TOOLS);
    const r = runPreflight(['--json'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'linux', PREFLIGHT_REPO_PATH: '/home/dev/repo' },
    });
    const data = parseJson(r.stdout);
    expect(Array.isArray(data.checks)).toBe(true);
    expect(typeof data.fails).toBe('number');
    expect(typeof data.warns).toBe('number');
  });
});

describe('scripts/preflight.sh — green devcontainer path', () => {
  it('all tools present + native Linux => 0 fails, exit 0', () => {
    const stub = makeStubPath(REQUIRED_TOOLS);
    const r = runPreflight(['--json'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'linux', PREFLIGHT_REPO_PATH: '/workspaces/repo' },
    });
    const data = parseJson(r.stdout);
    const failing = data.checks.filter((c) => c.status === 'fail');
    expect(failing, `unexpected FAILs: ${JSON.stringify(failing)}`).toHaveLength(0);
    expect(data.fails).toBe(0);
    expect(r.status).toBe(0);
  });

  it('green + --lab14 still passes on native Linux with tmux present', () => {
    const stub = makeStubPath(REQUIRED_TOOLS);
    const r = runPreflight(['--json', '--lab14'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'linux', PREFLIGHT_REPO_PATH: '/workspaces/repo' },
    });
    const data = parseJson(r.stdout);
    expect(data.fails).toBe(0);
    expect(r.status).toBe(0);
  });
});

describe('scripts/preflight.sh — FAIL classification', () => {
  it('missing copilot CLI is a FAIL with remediation mentioning install', () => {
    const stub = makeStubPath(REQUIRED_TOOLS.filter((t) => t !== 'copilot'));
    const r = runPreflight(['--json'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'linux', PREFLIGHT_REPO_PATH: '/workspaces/repo' },
    });
    const data = parseJson(r.stdout);
    const copilot = data.checks.find((c) => c.id === 'copilot');
    expect(copilot, 'no copilot check emitted').toBeDefined();
    expect(copilot!.status).toBe('fail');
    expect((copilot!.remediation ?? '') + (copilot!.message ?? '')).toMatch(/install|npm/i);
    expect(data.fails).toBeGreaterThanOrEqual(1);
    expect(r.status).not.toBe(0);
  });

  it('missing gh CLI is a FAIL', () => {
    const stub = makeStubPath(REQUIRED_TOOLS.filter((t) => t !== 'gh'));
    const r = runPreflight(['--json'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'linux', PREFLIGHT_REPO_PATH: '/workspaces/repo' },
    });
    const data = parseJson(r.stdout);
    expect(data.checks.find((c) => c.id === 'gh')!.status).toBe('fail');
    expect(r.status).not.toBe(0);
  });

  it('WSL1 is a FAIL for Lab 14', () => {
    const stub = makeStubPath(REQUIRED_TOOLS);
    const r = runPreflight(['--json', '--lab14'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'wsl1', PREFLIGHT_REPO_PATH: '/home/dev/repo' },
    });
    const data = parseJson(r.stdout);
    const osCheck = data.checks.find((c) => c.id === 'os');
    expect(osCheck!.status).toBe('fail');
    expect(r.status).not.toBe(0);
  });

  it('Windows PowerShell-only is a FAIL for Lab 14', () => {
    const stub = makeStubPath(REQUIRED_TOOLS);
    const r = runPreflight(['--json', '--lab14'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'windows', PREFLIGHT_REPO_PATH: 'C:\\repo' },
    });
    const data = parseJson(r.stdout);
    expect(data.checks.find((c) => c.id === 'os')!.status).toBe('fail');
    expect(r.status).not.toBe(0);
  });

  it('missing tmux under --lab14 is a FAIL', () => {
    const stub = makeStubPath(REQUIRED_TOOLS.filter((t) => t !== 'tmux'));
    const r = runPreflight(['--json', '--lab14'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'linux', PREFLIGHT_REPO_PATH: '/workspaces/repo' },
    });
    const data = parseJson(r.stdout);
    expect(data.checks.find((c) => c.id === 'tmux')!.status).toBe('fail');
    expect(r.status).not.toBe(0);
  });
});

describe('scripts/preflight.sh — WARN classification (does not fail)', () => {
  it('WSL2 with repo on /mnt/c/ is a WARN (degraded, not fail)', () => {
    const stub = makeStubPath(REQUIRED_TOOLS);
    const r = runPreflight(['--json'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'wsl2', PREFLIGHT_REPO_PATH: '/mnt/c/Users/dev/repo' },
    });
    const data = parseJson(r.stdout);
    const osCheck = data.checks.find((c) => c.id === 'os')!;
    expect(osCheck.status).toBe('warn');
    expect((osCheck.message ?? '') + (osCheck.remediation ?? '')).toMatch(/mnt\/c|Linux filesystem|\/home/i);
    expect(data.fails).toBe(0);
    expect(r.status).toBe(0);
  });

  it('WSL2 with repo on Linux filesystem is a PASS', () => {
    const stub = makeStubPath(REQUIRED_TOOLS);
    const r = runPreflight(['--json'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'wsl2', PREFLIGHT_REPO_PATH: '/home/dev/repo' },
    });
    const data = parseJson(r.stdout);
    expect(data.checks.find((c) => c.id === 'os')!.status).toBe('pass');
    expect(data.fails).toBe(0);
    expect(r.status).toBe(0);
  });

  it('missing tmux WITHOUT --lab14 is a WARN (not a FAIL)', () => {
    const stub = makeStubPath(REQUIRED_TOOLS.filter((t) => t !== 'tmux'));
    const r = runPreflight(['--json'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'linux', PREFLIGHT_REPO_PATH: '/workspaces/repo' },
    });
    const data = parseJson(r.stdout);
    expect(data.checks.find((c) => c.id === 'tmux')!.status).toBe('warn');
    expect(data.fails).toBe(0);
    expect(r.status).toBe(0);
  });

  it('missing container runtime (docker/podman) is a WARN, not a FAIL', () => {
    const stub = makeStubPath(REQUIRED_TOOLS.filter((t) => t !== 'docker'));
    const r = runPreflight(['--json'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'linux', PREFLIGHT_REPO_PATH: '/home/dev/repo' },
    });
    const data = parseJson(r.stdout);
    const container = data.checks.find((c) => c.id === 'container-runtime');
    expect(container, 'no container-runtime check emitted').toBeDefined();
    expect(container!.status).toBe('warn');
    expect(data.fails).toBe(0);
    expect(r.status).toBe(0);
  });
});

describe('scripts/preflight.sh — remediation is actionable', () => {
  it('every FAIL check carries a non-empty remediation string', () => {
    const stub = makeStubPath([]); // everything missing
    const r = runPreflight(['--json', '--lab14'], {
      toolDir: stub,
      env: { PREFLIGHT_OS: 'wsl1', PREFLIGHT_REPO_PATH: '/mnt/c/repo' },
    });
    const data = parseJson(r.stdout);
    const fails = data.checks.filter((c) => c.status === 'fail');
    expect(fails.length).toBeGreaterThan(0);
    for (const f of fails) {
      expect(f.remediation, `FAIL ${f.id} has no remediation`).toBeTruthy();
      expect((f.remediation ?? '').trim().length).toBeGreaterThan(5);
    }
  });
});
