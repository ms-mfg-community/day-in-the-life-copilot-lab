import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lab 17 contract — the mechanical definition of done for `specs/labs/lab17.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and this directory when its lab's pass starts, and a relative
 * import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab17.md');
const SPEC = join(ROOT, 'specs/labs/lab17.md');

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

describe('lab17 contract: the spec exists and governs', () => {
  it('specs/labs/lab17.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC)).toBe(true);
  });
});

describe('lab17 contract: AC4 — only the published policy date is asserted', () => {
  it('keeps the sourced effective date 2026-08-26', () => {
    expect(lab()).toMatch(/2026-08-26|August 26/);
  });

  it('drops the unsourced 2026-09-01 enforcement date', () => {
    expect(lab()).not.toMatch(/2026-09-01/);
  });

  it('claims no org-wide enforcement in September', () => {
    expect(lab()).not.toMatch(/enforced org-wide by\s+2026-09|Sept(?:ember)?\s*2026\s*\)/i);
  });
});

describe('lab17 contract: AC5 — the exception list matches the changelog', () => {
  it('the unsourced FedRAMP exception is gone', () => {
    expect(lab()).not.toMatch(/FedRAMP/i);
  });

  it('does not claim four exception categories', () => {
    expect(lab()).not.toMatch(/four exception categories/i);
  });

  it('keeps both sourced exception categories', () => {
    expect(lab()).toMatch(/open-weight/i);
    expect(lab()).toMatch(/data retention/i);
  });
});

describe('lab17 contract: AC6 — §17.0 is not an empty section', () => {
  it('if the 17.0 heading exists, it has content beyond a blockquote callout', () => {
    if (!hasSection('17.0')) return;
    const body = section('17.0')
      .split('\n')
      .filter((l) => l.trim() !== '' && !l.trim().startsWith('>'))
      .join('\n')
      .trim();
    expect(
      body.length,
      '§17.0 contains only a boilerplate callout — give it content or remove the heading',
    ).toBeGreaterThan(0);
  });
});

describe('lab17 contract: AC7 — agent audit fields are the documented ones', () => {
  it('names actor_is_agent', () => {
    expect(section('17.3')).toContain('actor_is_agent');
  });

  it('names agent_session_id', () => {
    expect(section('17.3')).toContain('agent_session_id');
  });

  it('the undocumented agent_session.task event family is gone', () => {
    expect(lab()).not.toMatch(/agent_session\.task/);
  });
});

describe('lab17 contract: AC8 — the agent-events reference is linked', () => {
  it('links the page that documents those fields', () => {
    expect(lab()).toContain('agentic-audit-log-events');
  });
});

describe('lab17 contract: AC9 — the correct claims survive', () => {
  it('retention is still stated as 180 days', () => {
    expect(lab()).toMatch(/180 days/);
  });

  it('SIEM streaming is still named for longer retention', () => {
    expect(lab()).toMatch(/SIEM/);
  });

  it('still states local session content is excluded from the audit log', () => {
    expect(section('17.3')).toMatch(/not\b[\s\S]{0,120}captur|excluded/i);
  });
});
