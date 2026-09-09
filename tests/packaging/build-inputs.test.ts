import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { put } from './fixtures.js';
import { resolveInputs, archiveSource } from '../../packaging/core/build/inputs.mjs';

const temporary: string[] = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('prepared release inputs', () => {
  it('uses registry pins and verifies the separate tool lock, not floating installs', () => {
    const inputs = resolveInputs(process.cwd());
    expect(inputs.platform).toBe('linux/amd64');
    for (const image of Object.values(inputs.images)) expect(image).toMatch(/@sha256:[a-f0-9]{64}$/);
    expect(inputs.tools['@github/copilot']).toMatch(/^\d+\.\d+\.\d+$/);
    expect(inputs.tools.pnpm).toMatch(/^\d+\.\d+\.\d+$/);
    expect(inputs.tools['@modelcontextprotocol/server-memory']).toBeDefined();
    expect(inputs.tools['typescript-language-server']).toBeDefined();
  });

  it('archives the requested commit, excluding untracked credentials and dirty hooks', () => {
    const root = mkdtempSync(join(tmpdir(), 'lab-archive-test-'));
    temporary.push(root);
    const source = join(root, 'repo');
    put(join(source, 'scripts/hooks/example.sh'), 'original hook\n');
    const git = (args: string[]) => execFileSync('git', ['-C', source, ...args], { stdio: 'pipe' });
    git(['init', '--quiet']);
    git(['add', 'scripts/hooks/example.sh']);
    git(['-c', 'user.name=Packaging Test', '-c', 'user.email=packaging@example.invalid',
      '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'test: committed source']);
    put(join(source, 'scripts/hooks/example.sh'), 'unrelated attendee edit\n');
    put(join(source, '.env'), 'credential-sentinel\n');
    const output = join(root, 'context');
    const record = archiveSource(source, 'HEAD', output);
    expect(readFileSync(join(output, 'scripts/hooks/example.sh'), 'utf8').replace(/\r\n/g, '\n')).toBe('original hook\n');
    expect(existsSync(join(output, '.env'))).toBe(false);
    expect(record.commit).toMatch(/^[a-f0-9]{40}$/);
    expect(record.archiveSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(readFileSync(join(source, 'scripts/hooks/example.sh'), 'utf8')).toBe('unrelated attendee edit\n');
  });

  it.each([
    ['unsupported platform', /platform: linux\/amd64/, 'platform: linux/arm64', /platform/],
    ['unsealed base', /node@sha256:[a-f0-9]{64}/, 'node:latest', /immutable digest/],
    ['changed tool pin', /pnpm: "[^"]+"/, 'pnpm: "0.0.0"', /manifest\/lock drift/],
  ])('rejects %s before a build', (_name, oldText, newText, message) => {
    const root = mkdtempSync(join(tmpdir(), 'lab-inputs-test-'));
    temporary.push(root);
    for (const file of ['docs/_meta/registry.yaml', 'packaging/core/tools/package.json', 'packaging/core/tools/package-lock.json']) {
      put(join(root, file), readFileSync(file, 'utf8').replace(oldText, newText));
    }
    expect(() => resolveInputs(root)).toThrow(message);
  });
});
