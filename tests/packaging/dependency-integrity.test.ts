import { afterEach, describe, expect, it, vi } from 'vitest';
import { accessSync, constants, mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { put } from './fixtures.js';
import { catalogDirectory, verifyCatalog } from '../../packaging/core/runtime/catalog.mjs';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, accessSync: vi.fn(actual.accessSync) };
});

const temporary: string[] = [];
function dependencies() {
  const root = mkdtempSync(join(tmpdir(), 'lab-dependency-integrity-'));
  temporary.push(root);
  put(join(root, 'fastify/package.json'), '{"main":"fastify.js"}');
  put(join(root, 'fastify/fastify.js'), 'export const app = true;\n');
  return root;
}
afterEach(() => {
  vi.mocked(accessSync).mockReset();
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('hydrated dependency integrity', () => {
  it('rejects a missing transitive application entry point even when its package directory remains', () => {
    const root = dependencies();
    const catalog = catalogDirectory(root);
    unlinkSync(join(root, 'fastify/fastify.js'));
    expect(() => verifyCatalog(root, catalog)).toThrow(/missing.*fastify\.js/i);
  });

  it('rejects modified dependency bytes without replacing them', () => {
    const root = dependencies();
    const catalog = catalogDirectory(root);
    put(join(root, 'fastify/fastify.js'), 'attendee dependency changes\n');
    expect(() => verifyCatalog(root, catalog)).toThrow(/changed.*fastify\.js/i);
    expect(readFileSync(join(root, 'fastify/fastify.js'), 'utf8')).toBe('attendee dependency changes\n');
  });

  it('allows additional runtime caches without treating them as sealed package content', () => {
    const root = dependencies();
    const catalog = catalogDirectory(root);
    put(join(root, '.vite/runtime-cache.json'), '{}');
    expect(() => verifyCatalog(root, catalog)).not.toThrow();
  });

  it('requires effective execution access for the current user, not another permission class', () => {
    const root = dependencies();
    const catalog = catalogDirectory(root);
    const executableCatalog = {
      ...catalog,
      entries: catalog.entries.map((entry) => entry.path === 'fastify/fastify.js' ? { ...entry, executable: true } : entry),
    };
    vi.mocked(accessSync).mockImplementationOnce(() => {
      throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
    });
    expect(() => verifyCatalog(root, executableCatalog)).toThrow(/not executable by the current user/);
    expect(accessSync).toHaveBeenCalledWith(join(root, 'fastify/fastify.js'), constants.X_OK);
  });
});
