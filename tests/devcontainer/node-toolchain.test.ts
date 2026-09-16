import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DEVCONTAINER = join(ROOT, '.devcontainer', 'devcontainer.json');
const POST_CREATE = join(ROOT, '.devcontainer', 'post-create.sh');

function stripJsonc(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

describe('devcontainer: provisions Node 20 + pnpm alongside .NET 8', () => {
  it('devcontainer.json exists', () => {
    expect(existsSync(DEVCONTAINER)).toBe(true);
  });

  const config = (() => {
    const txt = readFileSync(DEVCONTAINER, 'utf8');
    return JSON.parse(stripJsonc(txt));
  })();

  it('keeps .NET 8 SDK available', () => {
    const text = JSON.stringify(config);
    expect(text).toMatch(/dotnet:8\.0|\"version\":\s*\"8\.[0-9]+\"/);
  });

  it('installs Node 20 via devcontainer features', () => {
    const features = config.features ?? {};
    const nodeKey = Object.keys(features).find((k) => /node/.test(k));
    expect(nodeKey, 'no node feature configured').toBeDefined();
    const nodeFeature = features[nodeKey!];
    expect(String(nodeFeature.version)).toMatch(/^20(\.|$)/);
  });

  it('installs pnpm (via feature or post-create script)', () => {
    const features = config.features ?? {};
    const featuresJson = JSON.stringify(features);
    const postCreate = existsSync(POST_CREATE)
      ? readFileSync(POST_CREATE, 'utf8')
      : '';
    const hasPnpm =
      /pnpm/i.test(featuresJson) || /pnpm/i.test(postCreate);
    expect(hasPnpm, 'pnpm not provisioned').toBe(true);
  });
});
