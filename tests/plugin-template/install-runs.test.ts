import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

// Phase C.3 / Finding 2.3 — plugin-template/scripts/install.mjs exists and
// exports dryRun(), but the README advertises
//
//     node plugin-template/scripts/install.mjs   # expect ok=true
//
// which currently produces no output and is never exercised in CI. If the
// file silently does nothing (no CLI entry, unhandled failure, whatever),
// the README is false-advertising.
//
// This test asserts the *spawned* behavior README promises:
//   1. Running the script against the repo's own plugin-template succeeds
//      (exit 0, stdout reports ok=true).
//   2. Running against a scratch tempdir with a BROKEN manifest fails loudly
//      (non-zero exit, stderr / stdout surfaces the problem).
// Both arms are spawned as subprocesses rather than imported so we validate
// the install-as-a-user-would-run-it contract, not just the dryRun() helper.

const ROOT = process.cwd();
const INSTALL_SCRIPT = join(ROOT, 'plugin-template', 'scripts', 'install.mjs');
const TEMPLATE_DIR = join(ROOT, 'plugin-template');

let workdir: string;

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), 'plugin-install-'));
});

afterAll(() => {
  if (workdir) rmSync(workdir, { recursive: true, force: true });
});

describe('plugin-template: install.mjs CLI entry point', () => {
  it('install.mjs exists at the README-advertised path', () => {
    expect(existsSync(INSTALL_SCRIPT)).toBe(true);
  });

  it('running the script against the repo template exits 0 with a success marker', () => {
    const res = spawnSync('node', [INSTALL_SCRIPT], {
      cwd: ROOT,
      encoding: 'utf8',
    });

    expect(
      res.status,
      `install.mjs must exit 0 against the repo template.\nstdout:\n${res.stdout}\nstderr:\n${res.stderr}`,
    ).toBe(0);

    // README promises "expect ok=true". The CLI must surface that token so a
    // human operator (or CI grep) can tell pass from fail without parsing
    // stderr for the absence of an exception.
    expect(res.stdout.toLowerCase()).toMatch(/\bok\b.*true|ok=true|"ok":\s*true/);
  });

  it('accepts a template directory as argv[1] for scratch-dir testing', () => {
    // Copy the whole plugin-template into a tempdir and verify the script
    // happily dry-runs the copy. This proves the README workflow ("clone
    // the template and dry-run locally") actually works for a downstream
    // consumer, not just against the in-repo path.
    const scratch = join(workdir, 'my-plugin');
    const res0 = spawnSync('cp', ['-r', TEMPLATE_DIR, scratch]);
    expect(res0.status).toBe(0);

    const res = spawnSync('node', [INSTALL_SCRIPT, scratch], {
      cwd: workdir,
      encoding: 'utf8',
    });
    expect(
      res.status,
      `install.mjs must accept a template dir argv.\nstdout:\n${res.stdout}\nstderr:\n${res.stderr}`,
    ).toBe(0);
    expect(res.stdout.toLowerCase()).toMatch(/\bok\b/);
  });

  it('exits non-zero when the manifest is broken', () => {
    const broken = join(workdir, 'broken-plugin');
    mkdirSync(broken);
    // Manifest that references a non-existent agent entrypoint. dryRun() must
    // report ok=false, the CLI must propagate that as a non-zero exit.
    writeFileSync(
      join(broken, 'manifest.yaml'),
      [
        'name: broken-example',
        'version: 0.0.1',
        'description: missing entrypoint',
        'minimum_cli_version: 1.0.0',
        'entrypoints:',
        '  agents:',
        '    - agents/does-not-exist.md',
        '',
      ].join('\n'),
    );

    const res = spawnSync('node', [INSTALL_SCRIPT, broken], {
      cwd: workdir,
      encoding: 'utf8',
    });
    expect(
      res.status,
      `install.mjs must exit non-zero on broken manifest.\nstdout:\n${res.stdout}\nstderr:\n${res.stderr}`,
    ).not.toBe(0);
    // The surface error must mention the missing path so the user can fix it.
    const combined = `${res.stdout}\n${res.stderr}`;
    expect(combined).toMatch(/does-not-exist/);
  });
});
