import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Lab 11 contract — the mechanical definition of done for `specs/labs/lab11.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and `tests/lab-structure/` when its lab's pass starts, and a
 * relative import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab11.md');
const SPEC = join(ROOT, 'specs/labs/lab11.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');
const PARTIAL = join(ROOT, 'docs/_partials/currency.md');
const TEMPLATE = join(ROOT, 'plugin-template');
const PLUGIN_TESTS = join(ROOT, 'tests/plugin-template');

const lab = (): string => readFileSync(LAB, 'utf8');

type Line = { text: string; inFence: boolean };

function lines(body: string = lab()): Line[] {
  let inFence = false;
  const out: Line[] = [];
  for (const text of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(text)) {
      inFence = !inFence;
      out.push({ text, inFence: true });
      continue;
    }
    out.push({ text, inFence });
  }
  return out;
}

const headingLevel = (l: Line): number => {
  if (l.inFence) return 0;
  const m = l.text.match(/^(#{2,6})\s/);
  return m ? m[1].length : 0;
};

function section(prefix: string): string {
  const all = lines();
  const head = new RegExp(`^#{2,6}\\s+${prefix.replace(/\./g, '\\.')}(?![\\d.])`);
  const from = all.findIndex((l) => headingLevel(l) > 0 && head.test(l.text));
  expect(from, `heading "${prefix}" not found outside a code fence`).toBeGreaterThanOrEqual(0);
  const level = headingLevel(all[from]);
  const rest = all.slice(from + 1);
  const end = rest.findIndex((l) => {
    const lv = headingLevel(l);
    return lv > 0 && lv <= level;
  });
  return (end === -1 ? rest : rest.slice(0, end)).map((l) => l.text).join('\n');
}

interface Registry {
  labs?: Record<string, { pace_self_minutes?: number }>;
  enterprise_managed_settings?: { supported_keys?: string[] };
}
const registry = (): Registry => yaml.load(readFileSync(REGISTRY, 'utf8')) as Registry;

function frontmatter(): Record<string, any> {
  const m = lab().match(/^---\r?\n([\s\S]*?)\r?\n---/);
  expect(m, 'lab11 has no YAML frontmatter block').not.toBeNull();
  return yaml.load((m as RegExpMatchArray)[1]) as Record<string, any>;
}

const partialBody = (): string => {
  const ls = readFileSync(PARTIAL, 'utf8').replace(/\r\n/g, '\n').split('\n');
  return ls.slice(ls.findIndex((l) => l.startsWith('> '))).join('\n').trim();
};

function includedCurrency(): string {
  const m = lab()
    .replace(/\r\n/g, '\n')
    .match(
      /<!--\s*@include docs\/_partials\/currency\.md[\s\S]*?-->\n([\s\S]*?)<!--\s*@end-include docs\/_partials\/currency\.md\s*-->/,
    );
  expect(m, 'lab11 must include docs/_partials/currency.md between its markers').not.toBeNull();
  return (m as RegExpMatchArray)[1].trim();
}

describe('lab11 contract: the spec exists and governs', () => {
  it('specs/labs/lab11.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab11 contract: AC4 — §11.7 names the suites that actually exist', () => {
  it('the four named suites are exactly the *.test.ts files in tests/plugin-template/', () => {
    const onDisk = readdirSync(PLUGIN_TESTS)
      .filter((f) => f.endsWith('.test.ts'))
      .map((f) => f.replace('.test.ts', ''))
      .sort();
    const named = [...new Set([...section('11.7').matchAll(/`([a-z-]+)`/g)].map((m) => m[1]))]
      .filter((n) => onDisk.includes(n))
      .sort();
    expect(
      named,
      `§11.7 must name every suite in tests/plugin-template/: ${onDisk.join(', ')}`,
    ).toEqual(onDisk);
  });
});

describe('lab11 contract: AC5/AC6/AC7 — managed-settings facts come from the registry', () => {
  const supported = (): string[] => registry().enterprise_managed_settings?.supported_keys ?? [];

  it('the registry actually lists keys — otherwise these checks are vacuous', () => {
    expect(supported().length).toBeGreaterThan(0);
  });

  it('every managed-settings key the lab names is in the registry', () => {
    const known = new Set(supported());
    // Leaf names too, so `permissions.deny` is matched by a lab that writes `deny`.
    for (const k of supported()) if (k.includes('.')) known.add(k.split('.').pop() as string);
    const CANDIDATE = /`([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*)`/g;
    const named = [...new Set([...lab().matchAll(CANDIDATE)].map((m) => m[1]))].filter((n) =>
      /^(?:extraKnownMarketplaces|enabledPlugins|strictKnownMarketplaces|allowedMcpServers|deniedMcpServers|remoteControl|telemetry|sandbox|permissions(?:\.\w+)*|disableBypassPermissionsMode)$/.test(
        n,
      ),
    );
    const unknown = named.filter((n) => !known.has(n));
    expect(
      unknown,
      `lab11 names managed-settings key(s) absent from registry ` +
        `enterprise_managed_settings.supported_keys: ${unknown.join(', ')}. ` +
        `Registry lists: ${supported().join(', ')}`,
    ).toEqual([]);
  });

  it('disableBypassPermissionsMode always carries its permissions. prefix', () => {
    expect(
      lab(),
      'the registry records this key as `permissions.disableBypassPermissionsMode`; the bare ' +
        'form is the 2026-07-01 GA announcement spelling and is not what an admin writes',
    ).not.toMatch(/(?<!permissions\.)disableBypassPermissionsMode/);
  });

  it('§11.3 points at the registry rather than freezing a closed key list', () => {
    const s = section('11.3');
    const closed = /Supported keys today/i.test(s);
    const cites = /docs\/_meta\/registry\.yaml|enterprise_managed_settings/.test(s);
    expect(
      !closed || cites,
      '§11.3 presents "Supported keys today: …" as complete. The registry records 13 keys and ' +
        'states GitHub will continue adding them — treat the registry as the live list.',
    ).toBe(true);
  });
});

describe('lab11 contract: AC8 — the fictional org registry is marked illustrative', () => {
  it('§11.4 tells the learner to substitute their own source', () => {
    expect(
      section('11.4'),
      '§11.4 presents `/plugin install contoso-internal/contoso-copilot-plugins` as a numbered ' +
        'step. `contoso-internal` does not exist, so the install fails and steps 2–3 cannot be ' +
        'done at all.',
    ).toMatch(/substitute|replace .*(?:with )?your own|illustrative|your own org|example only/i);
  });
});

describe('lab11 contract: AC10 — declared pacing is internally consistent', () => {
  // Consistency only — the spec's ~30-minute figure is an estimated guideline, not a
  // floor. Re-deriving the real duration is the teachability gate's job.
  it('frontmatter, the registry and the inline callout agree', () => {
    const declared = frontmatter().pace?.self_paced_minutes;
    expect(registry().labs?.lab11?.pace_self_minutes, 'registry disagrees with frontmatter').toBe(
      declared,
    );
    expect(lab()).toMatch(new RegExp(`Self-paced:\\s*${declared}\\s*minutes`));
  });
});

describe('lab11 contract: AC11 — the currency block is the partial, not a copy of it', () => {
  it('§11.0 is byte-identical to docs/_partials/currency.md', () => {
    expect(
      includedCurrency(),
      'the currency block is shared by 10 labs. If it is wrong, fix the partial and re-sync ' +
        'every consumer — never edit it inline here. See specs/labs/lab11.md §5.',
    ).toBe(partialBody());
  });
});

describe('lab11 contract: AC12 — the plugin template the lab describes is on disk', () => {
  // Scoped to plugin-template/ deliberately. Three backticked paths in this lab are NOT
  // repo paths and must not be "fixed": `.github/workflows/release.yml` is relative to the
  // plugin directory, and `copilot/managed-settings.json` / `.github/copilot/settings.json`
  // live in an enterprise's .github-private repo. See specs/labs/lab11.md §6 D6.
  const ANATOMY = [
    'manifest.yaml',
    'org-policy.example.yaml',
    '.github/workflows/release.yml',
    'CODEOWNERS',
    'README.md',
    'scripts/install.mjs',
    'scripts/policy.mjs',
  ];

  it('every non-glob file §11.1 names resolves under plugin-template/', () => {
    const missing = ANATOMY.filter((rel) => !existsSync(join(TEMPLATE, rel)));
    expect(missing, `plugin-template/ is missing: ${missing.join(', ')}`).toEqual([]);
  });

  it('every entrypoint manifest.yaml declares resolves under plugin-template/', () => {
    const manifest = yaml.load(readFileSync(join(TEMPLATE, 'manifest.yaml'), 'utf8')) as {
      entrypoints?: Record<string, string[]>;
    };
    const declared = Object.values(manifest.entrypoints ?? {}).flat();
    expect(declared.length, 'manifest.yaml declares no entrypoints').toBeGreaterThan(0);
    const missing = declared.filter((rel) => !existsSync(join(TEMPLATE, rel)));
    expect(missing, `manifest.yaml points at missing file(s): ${missing.join(', ')}`).toEqual([]);
  });
});
