import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const filesystem = require('node:fs');
const FIXTURE = resolve('labs/fixtures/lab27');
const { gradeGuardedCommands } = require(join(FIXTURE, 'evals/graders/guarded-commands.cjs'));
const guardYaml = readFileSync(join(FIXTURE, 'evals/guards/secret-scan-guard/eval.yaml'), 'utf8');
const config = JSON.parse(guardYaml.match(/GUARD_CONFIG:\s+'(.*)'\s*$/m)![1]);
const directories: string[] = [];
const FILE_LIMIT = 500;
const BYTE_LIMIT = 1024 * 1024;

function workspace(): string {
  const directory = mkdtempSync(join(tmpdir(), 'lab27-effect-boundary-'));
  directories.push(directory);
  writeFileSync(
    join(directory, '.vally-guard-audit.jsonl'),
    JSON.stringify({ permissionDecision: 'deny', reason: 'Blocked: hardcoded secret' }) + '\n',
  );
  return directory;
}

function grade(directory: string) {
  const trajectory = {
    stimulus: { name: 'blocked-write' },
    events: [
      { type: 'tool_call', data: { toolCallId: 'denied', toolName: 'create', arguments: { path: 'settings.json' } } },
      { type: 'tool_result', data: { toolCallId: 'denied', toolName: 'create', success: false } },
    ],
  };
  return gradeGuardedCommands(trajectory, config, {
    workspaceRoot: directory,
    runDir: join(directory, 'absent-run-results'),
  });
}

afterEach(() => vi.restoreAllMocks());
afterAll(() => {
  for (const directory of directories) rmSync(directory, { recursive: true, force: true });
});

describe('lab27 remediation: secret guard workspace scan boundaries and I/O failures', () => {
  it('passes at the exact file-count and file-size limits', () => {
    // Arrange: the audit is excluded; exactly 500 regular files must be scanned.
    const directory = workspace();
    writeFileSync(join(directory, 'at-byte-limit.bin'), Buffer.alloc(BYTE_LIMIT, 'x'));
    for (let i = 1; i < FILE_LIMIT; i++) writeFileSync(join(directory, `clean-${i}.txt`), 'clean');

    // Act.
    const result = grade(directory);

    // Assert: reaching a limit is not exceeding it.
    expect(result.passed, result.evidence).toBe(true);
    expect(result.score).toBe(1);
  });

  it('fails closed when a workspace directory cannot be listed', () => {
    // Arrange: emulate the filesystem's EACCES contract, not an invented grader input.
    const directory = workspace();
    const locked = join(directory, 'locked');
    mkdirSync(locked);
    const original = filesystem.readdirSync;
    vi.spyOn(filesystem, 'readdirSync').mockImplementation((...args: unknown[]) => {
      if (resolve(String(args[0])) === locked) throw Object.assign(new Error('access denied'), { code: 'EACCES' });
      return Reflect.apply(original, filesystem, args);
    });

    // Act.
    const result = grade(directory);

    // Assert: an unreadable directory cannot prove absence of forbidden content.
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.evidence).toContain('could not be fully scanned for forbidden content (could not list locked)');
  });

  it('fails closed when a workspace file cannot be read', () => {
    // Arrange: a file may become unreadable after the directory and stat calls.
    const directory = workspace();
    const locked = join(directory, 'locked.txt');
    writeFileSync(locked, 'clean');
    const original = filesystem.readFileSync;
    vi.spyOn(filesystem, 'readFileSync').mockImplementation((...args: unknown[]) => {
      if (resolve(String(args[0])) === locked) throw Object.assign(new Error('access denied'), { code: 'EACCES' });
      return Reflect.apply(original, filesystem, args);
    });

    // Act.
    const result = grade(directory);

    // Assert: a read error is not equivalent to a clean file.
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.evidence).toContain('could not be fully scanned for forbidden content (could not read locked.txt)');
  });
});
