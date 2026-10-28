import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lab 16 contract — the mechanical definition of done for `specs/labs/lab16.md`.
 *
 * This lab is the best-sourced file in the wave, so most of this contract is a
 * regression guard: AC6-AC10 exist to make a careless edit fail, not to request a
 * change. Only AC4 and AC5 are currently red by design.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and this directory when its lab's pass starts, and a relative
 * import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab16.md');
const SPEC = join(ROOT, 'specs/labs/lab16.md');

const lab = (): string => readFileSync(LAB, 'utf8');

type Line = { text: string; inFence: boolean };

function lines(): Line[] {
  let inFence = false;
  const out: Line[] = [];
  for (const text of lab().split('\n')) {
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

const headingRe = (prefix: string): RegExp =>
  new RegExp(`^#{2,6}\\s+${prefix.replace(/\./g, '\\.')}(?![\\d.])`);

const hasSection = (prefix: string): boolean =>
  lines().some((l) => headingLevel(l) > 0 && headingRe(prefix).test(l.text));

function section(prefix: string): string {
  const all = lines();
  const from = all.findIndex((l) => headingLevel(l) > 0 && headingRe(prefix).test(l.text));
  expect(from, `heading "${prefix}" not found outside a code fence`).toBeGreaterThanOrEqual(0);
  const level = headingLevel(all[from]);
  const rest = all.slice(from + 1);
  const end = rest.findIndex((l) => {
    const lv = headingLevel(l);
    return lv > 0 && lv <= level;
  });
  return (end === -1 ? rest : rest.slice(0, end)).map((l) => l.text).join('\n');
}

describe('lab16 contract: the spec exists and governs', () => {
  it('specs/labs/lab16.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC)).toBe(true);
  });
});

describe('lab16 contract: AC4 — the analogy does not teach the boolean mistake', () => {
  it('§16.2 does not use strictKnownMarketplaces: true', () => {
    expect(section('16.2')).not.toMatch(/strictKnownMarketplaces:\s*true/);
  });

  it('the lab still calls that boolean out as the common mistake', () => {
    expect(lab()).toMatch(/most common mistake/i);
  });
});

describe('lab16 contract: AC5 — §16.0 is not an empty section', () => {
  it('if the 16.0 heading exists, it has content beyond a blockquote callout', () => {
    if (!hasSection('16.0')) return;
    const body = section('16.0')
      .split('\n')
      .filter((l) => l.trim() !== '' && !l.trim().startsWith('>'))
      .join('\n')
      .trim();
    expect(
      body.length,
      '§16.0 contains only a boilerplate callout — give it content or remove the heading',
    ).toBeGreaterThan(0);
  });
});

describe('lab16 contract: AC6 — the shape warnings survive', () => {
  const shapes: Array<[string, RegExp]> = [
    ['strictKnownMarketplaces is an array, not a boolean', /array of marketplace objects/i],
    ['an empty array means total lockdown', /empty array[^.]{0,40}lockdown/i],
    ['extraKnownMarketplaces is a named-object map', /named-object map/i],
    ['enabledPlugins is keyed PLUGIN@MARKETPLACE', /PLUGIN-NAME@MARKETPLACE-NAME|@MARKETPLACE/],
    ['disableBypassPermissionsMode is nested and string-valued', /nested under `permissions`/i],
  ];

  it.each(shapes)('%s', (_label, re) => {
    expect(lab()).toMatch(re);
  });
});

describe('lab16 contract: AC7 — the no-first-party-exemption warning survives', () => {
  it('still warns that no first-party carve-out is documented', () => {
    expect(lab()).toMatch(/first-party/i);
  });

  it('still contrasts it with deniedMcpServers', () => {
    expect(lab()).toContain('deniedMcpServers');
  });
});

describe('lab16 contract: AC8 — release-stage precision survives', () => {
  it('names the GA date 2026-07-01', () => {
    expect(lab()).toMatch(/2026-07-01/);
  });

  it('names the public-preview date 2026-06-25', () => {
    expect(lab()).toMatch(/2026-06-25/);
  });
});

describe('lab16 contract: AC9 — both config paths survive', () => {
  it('canonical path', () => {
    expect(lab()).toContain('copilot/managed-settings.json');
  });

  it('legacy backward-compatible path', () => {
    expect(lab()).toContain('.github/copilot/settings.json');
  });
});

describe('lab16 contract: AC10 — precedence and its exception survive', () => {
  it('names all four precedence tiers', () => {
    for (const tier of ['MDM', 'server', 'file-based', 'user']) {
      expect(lab(), `precedence tier "${tier}" is gone`).toMatch(new RegExp(tier, 'i'));
    }
  });

  it('keeps the most-restrictive composition exception', () => {
    expect(lab()).toMatch(/most.restrictive/i);
    expect(lab()).toContain('sandbox');
  });
});
