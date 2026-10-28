import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

/**
 * lab-copilot-cli-extensions contract — the mechanical definition of done for
 * `specs/labs/lab-copilot-cli-extensions.md`. Each describe block maps to a
 * numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and this directory when its lab's pass starts, and a relative
 * import would break on the move.
 *
 * NOTE: `labs-have-frontmatter.test.ts` filters on /^lab\d+\.md$/ and never sees
 * this file. AC10 below is the only frontmatter check this lab actually gets.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab-copilot-cli-extensions.md');
const SPEC = join(ROOT, 'specs/labs/lab-copilot-cli-extensions.md');

const lab = (): string => readFileSync(LAB, 'utf8');

/**
 * The lab as flowing prose: blockquote markers stripped and whitespace collapsed.
 * Every claim under review lives inside a `>` callout and wraps mid-sentence, so
 * a regex run against the raw text silently misses anything spanning a line break.
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

/**
 * Repo-relative paths worth checking. Restricted to this repository's own
 * documentation and source trees: the lab also cites paths the learner creates
 * during the exercise (`.github/extensions/clab-summarize/extension.mjs`,
 * `.github/hooks/*.json`), which are not expected on disk here.
 */
const REPO_DIRS = /^(labs|docs|solutions|specs|tests|scripts|mcp-configs|workshop)\//;

describe('lab-copilot-cli-extensions contract: the spec exists and governs', () => {
  it('specs/labs/lab-copilot-cli-extensions.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab-copilot-cli-extensions contract: AC4 — preToolUse decision values', () => {
  // Primary source, fetched 2026-10-15: docs.github.com/en/copilot/reference/hooks-reference
  // → "preToolUse decision control": permissionDecision takes "allow", "deny", "ask",
  // plus modifiedArgs. Event table output cell: "Yes — can allow, deny, or modify."
  it('no longer claims the runtime does not act on allow and ask', () => {
    expect(
      prose(),
      '§4.2 asserts allow/ask "does not act on them" and that each is "a no-op". The published ' +
        'reference documents all three values as processed. Correct the claim; keep the deny gate.',
    ).not.toMatch(/does not act on them|is a no-op|also a no-op|\bnot\b[\s*]*honou?red/i);
  });

  it('names all three permissionDecision values', () => {
    const body = lab();
    expect(body).toMatch(/permissionDecision/);
    expect(body).toMatch(/\ballow\b/i);
    expect(body).toMatch(/\bdeny\b/i);
    expect(body).toMatch(/\bask\b/i);
  });
});

describe('lab-copilot-cli-extensions contract: AC5 — the ask-degrades-to-deny cases', () => {
  // A bare /autopilot/ match is not enough: the shared currency partial already
  // mentions autopilot mode, so it would pass without the lab saying anything
  // about `ask`. Require all three ideas inside one window.
  it('explains, in one place, that ask degrades to deny under autopilot or cloud agent', () => {
    expect(
      hasWindowWith([/\bask\b/i, /\bden(?:y|ied|ies)\b/i, /autopilot|cloud agent/i]),
      'the reference names two cases where "ask" becomes "deny": cloud agent, and CLI autopilot mode',
    ).toBe(true);
  });
});

describe('lab-copilot-cli-extensions contract: AC6 — hook load order', () => {
  // The reference: hooks "are loaded from the following sources in order (policy,
  // then user, then project, then plugins) and combined" — user BEFORE project.
  it('does not claim project files load before user files', () => {
    expect(
      prose(),
      '§4.2 states "project files before user files". The reference states the opposite order, and ' +
        'names two source tiers the lab does not know about (policy and plugins).',
    ).not.toMatch(/project files before user files/i);
  });

  it('states the documented source order', () => {
    expect(
      prose(),
      'the lab should state the load order as policy → user → project → plugins',
    ).toMatch(/policy[\s\S]{0,80}user[\s\S]{0,80}project[\s\S]{0,80}plugin/i);
  });
});

describe('lab-copilot-cli-extensions contract: AC7 — userPromptSubmitted is attributed correctly', () => {
  // The lab's CONCLUSION is right — a config-file hook cannot rewrite the prompt —
  // but its premise is not: modifiedPrompt exists and is honored by SDK hooks only.
  it('names modifiedPrompt', () => {
    expect(
      lab(),
      '§5.2 says userPromptSubmitted output "is not honored by the runtime today". The reference ' +
        'documents a modifiedPrompt output, honored by SDK programmatic hooks; command and HTTP ' +
        'config-file hooks have their output dropped. Attribute the limit to the config-file surface.',
    ).toMatch(/modifiedPrompt/);
  });

  it('no longer blames the runtime wholesale', () => {
    expect(prose()).not.toMatch(/not honou?red by the runtime/i);
  });

  it('still reaches the correct conclusion about the config-file surface', () => {
    expect(
      lab(),
      'the lab\'s conclusion — the config-file hook cannot itself invoke the tool — is right and must survive',
    ).toMatch(/config-file hook surface|config-file surface/i);
  });
});

describe('lab-copilot-cli-extensions contract: AC8 — no unreachable source-of-truth path', () => {
  it('does not cite a ~/.copilot/session-state path as the reference', () => {
    expect(
      lab(),
      'the lab cites ~/.copilot/session-state/$(uuidgen)/files/copilot-cli-extensions-authoring-guide.md ' +
        'as "the source of truth for every extension code line". That path names a per-session artifact ' +
        'on the author\'s machine and $(uuidgen) mints a fresh random UUID — no reader can ever open it. ' +
        'Replace it with the instruction that produces it: extensions_manage({operation: "guide"}).',
    ).not.toMatch(/session-state/);
  });

  it('still tells the reader how to produce the guide themselves', () => {
    expect(lab()).toMatch(/operation:\s*["']guide["']/);
  });
});

describe('lab-copilot-cli-extensions contract: AC9 — the hooks reference URL is current', () => {
  it('cites reference/hooks-reference rather than the superseded hooks-configuration path', () => {
    expect(
      lab(),
      'the lab cites .../reference/hooks-configuration four times; it now 302s to .../reference/hooks-reference',
    ).not.toMatch(/reference\/hooks-configuration/);
    expect(lab()).toMatch(/reference\/hooks-reference/);
  });
});

describe('lab-copilot-cli-extensions contract: AC10 — frontmatter and pacing', () => {
  it('has frontmatter with title, lab_number and pace', () => {
    const parsed = matter(lab());
    expect(parsed.matter.length, 'the lab is missing its frontmatter block').toBeGreaterThan(0);
    for (const key of ['title', 'lab_number', 'pace']) {
      expect(parsed.data[key], `lab-copilot-cli-extensions.md is missing frontmatter key "${key}"`).toBeDefined();
    }
  });

  it('frontmatter pace and the inline callout state the same minutes', () => {
    const fm = matter(lab()).data as { pace?: { presenter_minutes?: number; self_paced_minutes?: number } };
    const callout = lab().match(/Presenter pace:\s*(\d+)\s*minutes?\s*\|\s*Self-paced:\s*(\d+)/);
    expect(callout, 'the lab is missing its inline "⏱️ Presenter pace: …" callout').not.toBeNull();
    expect(Number(callout![1]), 'presenter minutes disagree between frontmatter and the inline callout').toBe(
      fm.pace?.presenter_minutes,
    );
    expect(Number(callout![2]), 'self-paced minutes disagree between frontmatter and the inline callout').toBe(
      fm.pace?.self_paced_minutes,
    );
  });
});

describe('lab-copilot-cli-extensions contract: AC11 — cited repo paths resolve', () => {
  it('every backticked path into this repository exists on disk', () => {
    const candidates = [
      ...lab().matchAll(/`([A-Za-z0-9_./-]+\.(?:md|json|yaml|yml|sh|mjs|ts|js))`/g),
    ]
      .map((m) => m[1])
      .filter((p) => !p.includes('*') && !p.startsWith('~') && !p.includes('<'))
      .filter((p) => REPO_DIRS.test(p));

    const missing = [...new Set(candidates)].filter((rel) => !existsSync(join(ROOT, rel)));
    expect(missing, `the lab cites path(s) that do not exist: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('lab-copilot-cli-extensions contract: AC12 — the lesson survives', () => {
  it('still teaches joinSession as the extension entry point', () => {
    expect(lab()).toMatch(/joinSession/);
  });

  it('still prefers session.sendAndWait over a hand-rolled model call', () => {
    const body = lab();
    expect(body).toMatch(/sendAndWait/);
    expect(
      body,
      'the "do not hand-roll a fetch to a model endpoint" warning is the security point of §3.2',
    ).toMatch(/fetch\(\)|hand-rolled|custom HTTP call/i);
  });

  it('still frames the deterministic gate in front of the probabilistic body', () => {
    expect(lab()).toMatch(/deterministic/i);
    expect(lab()).toMatch(/probabilistic/i);
  });

  it('still disambiguates the three extension surfaces', () => {
    const body = lab();
    expect(body).toMatch(/gh extension/);
    expect(body).toMatch(/MCP server/);
    expect(body).toMatch(/lab05\.md|lab-gh-extensions\.md/);
  });

  it('still explains the byte-vs-character basis of the 10 KB cap', () => {
    expect(
      lab(),
      'the wc -c vs wc -m callout is the best-grounded thing in the lab and is verifiable against the fixture',
    ).toMatch(/wc -c|GetByteCount/);
  });
});
