/**
 * AC15, the binding half (specs/005-teaching-spa.md 2.11; child issue 10): workshop/spa/docs/a11y-tool.md names the automated
 * accessibility checker the gate runs and the exact rule or tag selection passed to it, and this test fails if the runner's
 * configuration differs from that declaration.
 *
 * The runner's configuration is helpers/a11y-tool.mjs, the one module a11y-browser-check.mjs reads it from. Three things are
 * held together here: the JSON block the document declares, the module, and the installed checker's version. A fourth check
 * reads the runner's source: it must hand `A11Y_TOOL.runOnly` to the checker and name no selection of its own, because a
 * runner that passed anything else would run a configuration the document never declared.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { A11Y_TOOL } from './helpers/a11y-tool.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DOC = path.join(ROOT, 'workshop/spa/docs/a11y-tool.md');
const RUNNER = path.join(ROOT, 'tests/spa/a11y-browser-check.mjs');
const require = createRequire(import.meta.url);

/** The first ```json block of the document, parsed. */
function declaration(): unknown {
  const text = readFileSync(DOC, 'utf8');
  const block = /```json\s*\n([\s\S]*?)\n```/.exec(text);
  if (block === null) throw new Error('a11y-tool.md declares the configuration in a ```json block');
  return JSON.parse(block[1]);
}

/** A plain copy of the frozen module value, so deep equality compares values and not frozenness. */
const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe('AC15 — the declared checker and selection are what the gate runs', () => {
  it('the document names the checker and the exact selection, and they equal the runner configuration', () => {
    expect(declaration()).toEqual(plain(A11Y_TOOL));
  });

  it('the declared version is the installed version of the checker', () => {
    const installed = (require('axe-core/package.json') as { version: string }).version;
    expect(A11Y_TOOL.version).toBe(installed);
    expect((declaration() as { version: string }).version).toBe(installed);
  });

  it('the selection is by tag, names only WCAG A and AA tags, and the installed checker knows every one of them', () => {
    expect(A11Y_TOOL.runOnly.type).toBe('tag');
    expect(A11Y_TOOL.runOnly.values.length).toBeGreaterThan(0);
    for (const tag of A11Y_TOOL.runOnly.values) expect(tag).toMatch(/^wcag2(1|2)?aa?$/);
    const axe = require('axe-core') as { getRules(tags: string[]): Array<{ ruleId: string; tags: string[] }> };
    for (const tag of A11Y_TOOL.runOnly.values) expect(axe.getRules([tag]).length, tag).toBeGreaterThan(0);
    // The selection is every A/AA tag the checker defines: a tag it defines and the selection leaves out would be a silent gap.
    const known = new Set(axe.getRules([]).flatMap((rule) => rule.tags).filter((tag) => /^wcag2(1|2)?aa?$/.test(tag)));
    expect(new Set(A11Y_TOOL.runOnly.values)).toEqual(known);
  });

  it('the runner hands A11Y_TOOL.runOnly to the checker and declares no selection of its own', () => {
    const source = readFileSync(RUNNER, 'utf8');
    expect(source).toMatch(/import \{[^}]*\bA11Y_TOOL\b[^}]*\} from '\.\/helpers\/a11y-tool\.mjs'/);
    expect(source).toMatch(/axe\.run\(document, \{ runOnly \}\), A11Y_TOOL\.runOnly\)/);
    // No other runOnly, rules or tags option reaches axe.run: the one call above is the only one.
    expect(source.match(/axe\.run\(/g)).toHaveLength(1);
    expect(source).not.toMatch(/runOnly:\s*\{/);
    expect(source).not.toMatch(/\brules:\s*\{/);
  });

  it('the document says the gate runs the checker over every route and every opened state, and names the gate command', () => {
    const text = readFileSync(DOC, 'utf8');
    expect(text).toContain('npm run spa:test:a11y');
    expect(text).toContain('tests/spa/a11y-browser-check.mjs');
    expect(text).toMatch(/every route/);
    expect(text).toMatch(/opened state/);
  });
});
