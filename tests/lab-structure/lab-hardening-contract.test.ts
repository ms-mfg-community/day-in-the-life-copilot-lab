import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

/**
 * lab-hardening contract — the mechanical definition of done for
 * `specs/labs/lab-hardening.md`. Each describe block maps to a numbered
 * acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and this directory when its lab's pass starts, and a relative
 * import would break on the move.
 *
 * NOTE: `tests/lab-structure/labs-have-frontmatter.test.ts` filters on
 * /^lab\d+\.md$/ and therefore never sees this file. AC12 below is the only
 * frontmatter check this lab actually gets.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab-hardening.md');
const SPEC = join(ROOT, 'specs/labs/lab-hardening.md');
const CONFIG_REF = join(ROOT, 'docs/copilot-config-reference.md');
const HOOK_JSON = join(ROOT, 'solutions/lab-hardening/deny-unlisted-tools.json');

const lab = (): string => readFileSync(LAB, 'utf8');

/**
 * The lab as flowing prose: blockquote markers stripped and whitespace collapsed.
 * Claims in this file live inside `>` callouts and wrap mid-sentence, so a regex
 * run against the raw text silently misses anything spanning a line break.
 */
const prose = (): string =>
  lab()
    .split('\n')
    .map((l) => l.replace(/^\s*>\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ');

/** True when any ~`size`-char window of the prose satisfies every pattern. */
function hasWindowWith(patterns: RegExp[], size = 400): boolean {
  const text = prose();
  const step = Math.floor(size / 2);
  for (let i = 0; i < Math.max(text.length, 1); i += step) {
    const w = text.slice(i, i + size);
    if (patterns.every((p) => p.test(w))) return true;
  }
  return false;
}

describe('lab-hardening contract: the spec exists and governs', () => {
  it('specs/labs/lab-hardening.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab-hardening contract: AC4 — preToolUse decision values are stated correctly', () => {
  // Primary source, fetched 2026-10-15:
  // docs.github.com/en/copilot/reference/hooks-reference → "preToolUse decision
  // control": permissionDecision takes "allow", "deny", "ask"; the event table's
  // output cell reads "Yes — can allow, deny, or modify"; and modifiedArgs exists.
  it('no longer claims allow and ask are unhonored', () => {
    expect(
      prose(),
      'lab-hardening asserts allow/ask are "NOT honored". The published reference documents all ' +
        'three permissionDecision values as processed. Correct the claim; keep the default-deny design.',
    ).not.toMatch(/\bnot\b[\s*]*honou?red|accepted,? but (?:are )?ignored|accepted but ignored/i);
  });

  it('names all three permissionDecision values', () => {
    const body = lab();
    expect(body, 'lab-hardening should state that permissionDecision accepts allow, deny and ask').toMatch(
      /permissionDecision/,
    );
    expect(body).toMatch(/\ballow\b/i);
    expect(body).toMatch(/\bdeny\b/i);
    expect(body).toMatch(/\bask\b/i);
  });
});

describe('lab-hardening contract: AC5 — the ask-degrades-to-deny cases are named', () => {
  // A bare /autopilot/ match is not enough: the shared currency partial already
  // mentions autopilot mode, so it would pass without the lab saying anything
  // about `ask`. Require all three ideas inside one window.
  it('explains, in one place, that ask degrades to deny under autopilot or cloud agent', () => {
    expect(
      hasWindowWith([/\bask\b/i, /\bden(?:y|ied|ies)\b/i, /autopilot|cloud agent/i]),
      'The reference names two cases where "ask" becomes "deny": cloud agent, and CLI autopilot mode. ' +
        'That is sharper and more useful than the old "ask is a no-op" claim — state it somewhere the ' +
        'reader meets the three ideas together.',
    ).toBe(true);
  });
});

describe('lab-hardening contract: AC6 — default-deny is justified as a design choice', () => {
  // The posture is right; the old justification was a runtime limitation that no
  // longer exists. These two sentences are the justification, and both are false.
  it('does not say preToolUse only acts on deny', () => {
    expect(
      prose(),
      'lab-hardening justifies its design with "preToolUse only acts on deny" — no longer true',
    ).not.toMatch(/only acts on\s*`?deny/i);
  });

  it('does not call preToolUse the only event whose output is honored', () => {
    expect(
      prose(),
      'postToolUse, agentStop, subagentStop, sessionStart, subagentStart, permissionRequest and ' +
        'userPromptTransformed all process output. preToolUse is not the only one.',
    ).not.toMatch(/only event whose output is honou?red/i);
  });

  it('still argues the posture on blast radius', () => {
    expect(
      lab(),
      'the default-deny posture must survive the correction — it is the lab, and it is good advice ' +
        'independent of what the runtime honors',
    ).toMatch(/blast[- ]radius/i);
  });
});

describe('lab-hardening contract: AC7 — the config reference carries the same correction', () => {
  // docs/copilot-config-reference.md §4 is the canonical in-repo parameter reference
  // and this lab is its hands-on counterpart. Fixing only the lab moves the error.
  it('docs/copilot-config-reference.md no longer says allow/ask are accepted but ignored', () => {
    const ref = readFileSync(CONFIG_REF, 'utf8');
    expect(
      ref,
      'docs/copilot-config-reference.md §4 repeats the false deny-only claim (lines ~168, ~215, ~221 ' +
        'and accuracy-table row 10). Correct it in the same change — precedent: specs/labs/lab10.md D4.',
    ).not.toMatch(/accepted but ignored|accepted,? but (?:are )?ignored/i);
  });

  it('docs/copilot-config-reference.md no longer says only deny is acted on', () => {
    const ref = readFileSync(CONFIG_REF, 'utf8');
    expect(ref).not.toMatch(/[Oo]nly\s*`?deny`?\s*is\s*(?:currently\s*)?acted on/);
  });
});

describe('lab-hardening contract: AC8 — the shipped hook comment is corrected', () => {
  it('deny-unlisted-tools.json _comment drops the false claim', () => {
    const raw = readFileSync(HOOK_JSON, 'utf8');
    expect(
      raw,
      'solutions/lab-hardening/deny-unlisted-tools.json carries the deny-only claim a third time, in its _comment',
    ).not.toMatch(/accepted but ignored|honors only\s*`?deny/i);
  });

  it('the hook still behaves as a default-deny allow-list', () => {
    // AC10 depends on this file's behaviour being untouched. Only prose changes.
    const parsed = JSON.parse(readFileSync(HOOK_JSON, 'utf8')) as {
      hooks?: { preToolUse?: Array<{ bash?: string; powershell?: string }> };
    };
    const entry = parsed.hooks?.preToolUse?.[0];
    expect(entry, 'the preToolUse entry must survive the comment edit').toBeDefined();
    expect(entry!.bash, 'the bash branch must still emit a deny decision').toMatch(/permissionDecision/);
    expect(entry!.powershell, 'the powershell branch must still emit a deny decision').toMatch(
      /permissionDecision/,
    );
  });
});

describe('lab-hardening contract: AC9 — the hooks reference URL is current', () => {
  it('cites reference/hooks-reference rather than the superseded hooks-configuration path', () => {
    expect(
      lab(),
      'labs/lab-hardening.md cites .../reference/hooks-configuration in three places; it now 302s to ' +
        '.../reference/hooks-reference',
    ).not.toMatch(/reference\/hooks-configuration/);
    expect(lab()).toMatch(/reference\/hooks-reference/);
  });
});

describe('lab-hardening contract: AC10 — prose allow-list matches the shipped hook', () => {
  it('every runtime tool name the hook permits is named in the lab', () => {
    const raw = readFileSync(HOOK_JSON, 'utf8');
    const body = lab();
    for (const tool of ['view', 'glob', 'grep', 'microsoft-learn-microsoft_docs_search']) {
      expect(raw, `fixture no longer allows ${tool}`).toContain(tool);
      expect(
        body,
        `lab-hardening describes an allow-list that omits "${tool}", which the shipped hook permits`,
      ).toContain(tool);
    }
  });
});

describe('lab-hardening contract: AC11 — the two-layer gating lesson survives', () => {
  it('still teaches an exact agent tools allow-list', () => {
    expect(lab()).toMatch(/tight-reviewer/);
    expect(lab()).toMatch(/allow-list/i);
  });

  it('still teaches the hook as an independent second layer', () => {
    expect(lab()).toMatch(/deny-unlisted-tools/);
    expect(lab()).toMatch(/defense[- ]in[- ]depth|belt (?:\*\*)?and(?:\*\*)? braces/i);
  });

  it('still distinguishes frontmatter names from runtime tool names', () => {
    expect(
      lab(),
      'the two-namespace callout is the sharpest material in this lab and must not be lost',
    ).toMatch(/runtime tool name/i);
  });
});

describe('lab-hardening contract: AC12 — frontmatter and pacing', () => {
  it('has frontmatter with title, lab_number and pace', () => {
    const parsed = matter(lab());
    expect(parsed.matter.length, 'lab-hardening.md is missing its frontmatter block').toBeGreaterThan(0);
    for (const key of ['title', 'lab_number', 'pace']) {
      expect(parsed.data[key], `lab-hardening.md is missing frontmatter key "${key}"`).toBeDefined();
    }
  });

  it('frontmatter pace and the inline callout state the same minutes', () => {
    const fm = matter(lab()).data as { pace?: { presenter_minutes?: number; self_paced_minutes?: number } };
    const callout = lab().match(/Presenter pace:\s*(\d+)\s*minutes?\s*\|\s*Self-paced:\s*(\d+)/);
    expect(callout, 'lab-hardening is missing its inline "⏱️ Presenter pace: …" callout').not.toBeNull();
    expect(Number(callout![1]), 'presenter minutes disagree between frontmatter and the inline callout').toBe(
      fm.pace?.presenter_minutes,
    );
    expect(Number(callout![2]), 'self-paced minutes disagree between frontmatter and the inline callout').toBe(
      fm.pace?.self_paced_minutes,
    );
  });
});
