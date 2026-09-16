import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { digest, fixture, put } from './fixtures.js';
import { initializeWorkspace, inspectWorkspace } from '../../packaging/core/runtime/initialize.mjs';
import { loadRelease, assertCompatible, sealRelease } from '../../packaging/core/runtime/release.mjs';

const temporary: string[] = [];
function setup() {
  const data = fixture();
  temporary.push(data.root);
  return data;
}

function withLegacyScript() {
  const data = setup();
  const original = '#!/bin/sh\r\nprintf prepared\r\n';
  const linux = original.replace(/\r\n/g, '\n');
  put(join(data.workspace, 'scripts/example.sh'), original);
  const { releaseId, ...content } = data.release;
  const release = sealRelease({
    ...content, scriptLineEndings: { 'scripts/example.sh': { original: digest(original), linux: digest(linux) } },
  });
  put(join(data.runtime, 'release.json'), JSON.stringify(release));
  return { ...data, original, linux };
}

afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('prepared core local initialization', () => {
  it('hydrates both JavaScript closures and NuGet from actual sealed archives', () => {
    const { workspace, runtime } = setup();
    initializeWorkspace(workspace, runtime);
    for (const target of ['node_modules', 'node/node_modules', '.lab-state/nuget']) {
      expect(readFileSync(join(workspace, target, 'content.txt'), 'utf8')).toContain('sealed dependencies');
    }
    expect(JSON.parse(readFileSync(join(workspace, '.lab-state/state.json'), 'utf8')).status).toBe('ready');
  });

  it('preserves edited source, memory, configuration, and dependencies on resume', () => {
    const { workspace, runtime } = setup();
    initializeWorkspace(workspace, runtime);
    const files = ['node/web/example.ts', '.lab-state/memory.jsonl', '.lab-state/mcp.json', 'node_modules/content.txt'];
    for (const file of files) put(join(workspace, file), 'attendee work\n');
    const before = statSync(join(workspace, 'node_modules/content.txt')).mtimeMs;
    initializeWorkspace(workspace, runtime);
    for (const file of files) expect(readFileSync(join(workspace, file), 'utf8')).toBe('attendee work\n');
    expect(statSync(join(workspace, 'node_modules/content.txt')).mtimeMs).toBe(before);
  });

  it('supports renamed checkouts without replacing their state', () => {
    const { root, workspace, runtime } = setup();
    initializeWorkspace(workspace, runtime);
    put(join(workspace, '.lab-state/memory.jsonl'), 'remember me\n');
    const renamed = join(root, 'another checkout name');
    renameSync(workspace, renamed);
    initializeWorkspace(renamed, runtime);
    expect(readFileSync(join(renamed, '.lab-state/memory.jsonl'), 'utf8')).toBe('remember me\n');
  });

  it('fails before mutation when any bundled archive is missing', () => {
    const { workspace, runtime } = setup();
    rmSync(join(runtime, 'bundles/node.tar.gz'));
    expect(() => initializeWorkspace(workspace, runtime)).toThrow(/missing.*bundle|bundle.*missing/i);
    expect(existsSync(join(workspace, 'node_modules'))).toBe(false);
    expect(existsSync(join(workspace, '.lab-state/state.json'))).toBe(false);
  });

  it('rejects corrupt bundles without downloading or partially hydrating', () => {
    const { workspace, runtime } = setup();
    put(join(runtime, 'bundles/nuget.tar.gz'), 'corrupt');
    expect(() => initializeWorkspace(workspace, runtime)).toThrow(/checksum/i);
    expect(existsSync(join(workspace, 'node_modules'))).toBe(false);
  });

  it('rejects dependency drift but accepts ordinary source edits', () => {
    const { workspace, runtime } = setup();
    put(join(workspace, 'node/web/example.ts'), 'export const answer = 42;\n');
    initializeWorkspace(workspace, runtime);
    put(join(workspace, 'node/package.json'), '{"changed":true}\n');
    expect(() => initializeWorkspace(workspace, runtime)).toThrow(/dependency.*drift/i);
    expect(readFileSync(join(workspace, 'node/web/example.ts'), 'utf8')).toContain('42');
  });

  it('does not overwrite dependencies it did not initialize', () => {
    const { workspace, runtime } = setup();
    put(join(workspace, 'node/node_modules/content.txt'), 'pre-existing\n');
    expect(() => initializeWorkspace(workspace, runtime)).toThrow(/unowned|existing dependencies/i);
    expect(readFileSync(join(workspace, 'node/node_modules/content.txt'), 'utf8')).toBe('pre-existing\n');
    expect(existsSync(join(workspace, 'node_modules'))).toBe(false);
  });

  it('fails rather than reinstalling a damaged resumed workspace', () => {
    const { workspace, runtime } = setup();
    initializeWorkspace(workspace, runtime);
    rmSync(join(workspace, 'node/node_modules'), { recursive: true });
    expect(() => initializeWorkspace(workspace, runtime)).toThrow(/missing.*initialized|initialized.*missing/i);
    expect(existsSync(join(workspace, 'node/node_modules'))).toBe(false);
  });

  it('rejects another release and retains attendee work', () => {
    const { workspace, runtime } = setup();
    initializeWorkspace(workspace, runtime);
    const state = join(workspace, '.lab-state/state.json');
    const original = JSON.parse(readFileSync(state, 'utf8'));
    put(state, JSON.stringify({ ...original, releaseId: 'c'.repeat(64) }));
    expect(() => initializeWorkspace(workspace, runtime)).toThrow(/release mismatch/i);
    expect(JSON.parse(readFileSync(state, 'utf8')).releaseId).toBe('c'.repeat(64));
  });

  it('rejects a concurrent initializer without touching the workspace', () => {
    const { workspace, runtime } = setup();
    put(join(workspace, '.lab-state/initializing.lock'), 'another initializer');
    expect(() => initializeWorkspace(workspace, runtime)).toThrow(/initializ.*lock|already.*initializ/i);
    expect(existsSync(join(workspace, 'node_modules'))).toBe(false);
  });

  it('can inspect a ready workspace but never hydrates one through readiness', () => {
    const { workspace, runtime } = setup();
    expect(() => inspectWorkspace(workspace, runtime)).toThrow(/not initialized/);
    expect(existsSync(join(workspace, 'node_modules'))).toBe(false);
    initializeWorkspace(workspace, runtime);
    expect(inspectWorkspace(workspace, runtime).workspace).toBe(workspace);
  });

  it('continues interrupted bookkeeping without recopying an owned artifact', () => {
    const { workspace, runtime } = setup();
    initializeWorkspace(workspace, runtime);
    const file = join(workspace, '.lab-state/state.json');
    const state = JSON.parse(readFileSync(file, 'utf8'));
    put(file, JSON.stringify({ ...state, status: 'initializing', completed: ['root', 'node'] }));
    put(join(workspace, '.lab-state/nuget/content.txt'), 'preserved initialized content');
    initializeWorkspace(workspace, runtime);
    expect(readFileSync(join(workspace, '.lab-state/nuget/content.txt'), 'utf8')).toBe('preserved initialized content');
    expect(JSON.parse(readFileSync(file, 'utf8')).completed).toEqual(['root', 'node', 'nuget']);
  });

  it('does not trust an incomplete ready marker', () => {
    const { workspace, runtime } = setup();
    initializeWorkspace(workspace, runtime);
    const file = join(workspace, '.lab-state/state.json');
    const state = JSON.parse(readFileSync(file, 'utf8'));
    put(file, JSON.stringify({ ...state, completed: ['root'] }));
    expect(() => inspectWorkspace(workspace, runtime)).toThrow(/invalid.*state/i);
  });

  it('rejects a symlink redirecting managed state outside the checkout', () => {
    const { root, workspace, runtime } = setup();
    const outside = join(root, 'outside');
    mkdirSync(outside);
    symlinkSync(outside, join(workspace, '.lab-state'), process.platform === 'win32' ? 'junction' : 'dir');
    expect(() => initializeWorkspace(workspace, runtime)).toThrow(/symlink/);
    expect(existsSync(join(outside, 'state.json'))).toBe(false);
  });

  it('rejects changed artifact ownership and malformed state without overwriting it', () => {
    const { workspace, runtime } = setup();
    initializeWorkspace(workspace, runtime);
    const marker = join(workspace, 'node_modules/.lab-bundle.json');
    put(marker, JSON.stringify({ releaseId: '0'.repeat(64), sha256: '1'.repeat(64) }));
    expect(() => initializeWorkspace(workspace, runtime)).toThrow(/ownership mismatch/);
    put(join(workspace, '.lab-state/state.json'), 'not json');
    expect(() => inspectWorkspace(workspace, runtime)).toThrow(/Cannot read JSON/);
  });

  it('normalizes only known pristine CRLF executable source at first initialization', () => {
    const { workspace, runtime, linux } = withLegacyScript();
    initializeWorkspace(workspace, runtime);
    expect(readFileSync(join(workspace, 'scripts/example.sh'), 'utf8')).toBe(linux);
    put(join(workspace, 'scripts/example.sh'), '#!/bin/sh\nprintf attendee\n');
    initializeWorkspace(workspace, runtime);
    expect(readFileSync(join(workspace, 'scripts/example.sh'), 'utf8')).toContain('attendee');
  });

  it('refuses to rewrite modified CRLF scripts and does not partially hydrate', () => {
    const { workspace, runtime } = withLegacyScript();
    const edited = '#!/bin/sh\r\nprintf attendee-work\r\n';
    put(join(workspace, 'scripts/example.sh'), edited);
    expect(() => initializeWorkspace(workspace, runtime)).toThrow(/refusing to rewrite/);
    expect(readFileSync(join(workspace, 'scripts/example.sh'), 'utf8')).toBe(edited);
    expect(existsSync(join(workspace, 'node_modules'))).toBe(false);
  });

  it('never normalizes source again on resume', () => {
    const { workspace, runtime, original } = withLegacyScript();
    initializeWorkspace(workspace, runtime);
    put(join(workspace, 'scripts/example.sh'), original);
    expect(() => initializeWorkspace(workspace, runtime)).toThrow(/refusing to rewrite/);
    expect(readFileSync(join(workspace, 'scripts/example.sh'), 'utf8')).toBe(original);
  });
});

describe('release boundary validation', () => {
  it('rejects native ABI and platform mismatches', () => {
    const { runtime } = setup();
    const release = loadRelease(runtime);
    expect(() => assertCompatible(release, { os: 'wrong', arch: process.arch, nodeMajor: 1, nodeAbi: '1' }))
      .toThrow(/platform|ABI|runtime/i);
  });

  it('rejects malformed and self-inconsistent release records', () => {
    const { runtime, release } = setup();
    put(join(runtime, 'release.json'), JSON.stringify({ ...release, schemaVersion: 99 }));
    expect(() => loadRelease(runtime)).toThrow(/release.*schema|invalid.*release/i);
    put(join(runtime, 'release.json'), JSON.stringify({ ...release, releaseId: 'd'.repeat(64) }));
    expect(() => loadRelease(runtime)).toThrow(/release.*checksum|release.*identity/i);
  });

  it('rejects path traversal in manifest inputs', () => {
    const { runtime, release } = setup();
    const { releaseId, ...content } = release;
    put(join(runtime, 'release.json'), JSON.stringify(sealRelease({ ...content, inputs: { '../outside': 'e'.repeat(64) } })));
    expect(() => loadRelease(runtime)).toThrow(/Invalid relative content path/);
  });

  it('rejects missing tool payloads before hydration', () => {
    const { workspace, runtime } = setup();
    rmSync(join(runtime, 'tools/copilot'));
    expect(() => initializeWorkspace(workspace, runtime)).toThrow(/Missing prepared runtime content/);
    expect(existsSync(join(workspace, 'node_modules'))).toBe(false);
  });
});
