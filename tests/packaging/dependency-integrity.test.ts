import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { put } from './fixtures.js';
import { catalogDirectory, verifyCatalog } from '../../packaging/core/runtime/catalog.mjs';

const temporary: string[] = [];
function dependencies() {
  const root = mkdtempSync(join(tmpdir(), 'lab-dependency-integrity-'));
  temporary.push(root);
  put(join(root, 'fastify/package.json'), '{"main":"fastify.js"}');
  put(join(root, 'fastify/fastify.js'), 'export const app = true;\n');
  return root;
}
afterEach(() => {
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
});
