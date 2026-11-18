import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

/**
 * lab-gh-extensions contract — the mechanical definition of done for
 * `specs/labs/lab-gh-extensions.md`. Each describe block maps to a numbered
 * acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and this directory when its lab's pass starts, and a relative
 * import would break on the move.
 *
 * NOTE: `labs-have-frontmatter.test.ts` filters on /^lab\d+\.md$/ and never sees
 * this file. AC8 below is the only frontmatter check this lab actually gets.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab-gh-extensions.md');
const SPEC = join(ROOT, 'specs/labs/lab-gh-extensions.md');

const lab = (): string => readFileSync(LAB, 'utf8');

/**
 * The lab as flowing prose: blockquote markers stripped and whitespace collapsed.
 * The claims under review live inside `>` callouts and wrap mid-sentence, so a
 * regex run against the raw text silently misses anything spanning a line break.
 */
const prose = (): string =>
  lab()
    .split('\n')
    .map((l) => l.replace(/^\s*>\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ');

/**
 * Repo-relative paths worth checking. Restricted to this repository's own
 * documentation and source trees: the lab also cites paths that live inside the
 * learner's scaffolded extension (`script/build.sh`) or that the learner creates
 * (`.git/hooks/pre-commit`), and neither is expected on disk here.
 */
const REPO_DIRS = /^(labs|docs|solutions|specs|tests|scripts|mcp-configs|workshop)\//;

/** The fenced block that writes the git pre-commit hook, with a little context. */
function preCommitBlock(): string {
  const body = lab();
  const at = body.indexOf('.git/hooks/pre-commit');
  expect(at, 'lab-gh-extensions no longer contains the .git/hooks/pre-commit step').toBeGreaterThan(-1);
  return body.slice(Math.max(0, at - 700), at + 900);
}

describe('lab-gh-extensions contract: the spec exists and governs', () => {
  it('specs/labs/lab-gh-extensions.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab-gh-extensions contract: AC4 — no unsourced token budget', () => {
  // Same trap specs/labs/lab10.md C2 cut: a vendor-shaped number asserted with no
  // source. Keep the technique (deterministic byte-slice); drop the "safe ceiling".
  it('does not present a byte cap as a published safe ceiling', () => {
    expect(
      prose(),
      'lab-gh-extensions calls 60 KB "a safe ceiling for current general-purpose chat models" with no ' +
        'source. Present it as an example cap the reader chooses and tunes.',
    ).not.toMatch(/safe ceiling/i);
  });

  it('does not assert a token equivalence for that cap', () => {
    expect(
      prose(),
      'the "~15K tokens of code-shaped text" equivalence is unsourced and model-dependent',
    ).not.toMatch(/\d+\s*K\s+tokens/i);
  });

  it('still teaches the deterministic slice technique', () => {
    expect(
      lab(),
      'the head -c / paginate-by-file advice is good and must survive the cut',
    ).toMatch(/head -c/);
  });
});

describe('lab-gh-extensions contract: AC5 — the pre-commit step does not clobber', () => {
  it('guards or backs up an existing pre-commit hook before writing', () => {
    expect(
      preCommitBlock(),
      'lab-gh-extensions writes .git/hooks/pre-commit with `cat >`, destroying any existing hook ' +
        '(husky, lefthook, pre-commit, or this repo\'s own scripts/hooks/pre-commit-strip-notebook-outputs.sh) ' +
        'with no check and no backup.',
    ).toMatch(/\[\s*-[ef]\s|\.bak\b|already exists|if\s+\[|Test-Path|back(?:ed)? ?up/i);
  });
});

describe('lab-gh-extensions contract: AC6 — the worktree hazard is called out', () => {
  // Verified 2026-10-15: `git -C <worktree> rev-parse --git-path hooks` resolves to
  // the MAIN checkout's .git/hooks — the hooks dir is common, not per-worktree. And
  // inside a worktree `.git` is a file, so `cat > .git/hooks/...` fails outright.
  it('warns that the git hooks directory is shared across worktrees', () => {
    expect(
      prose(),
      'lab-gh-extensions never mentions worktrees, yet .git/hooks is shared by every worktree of the ' +
        'repository — a hook written from one arms it for all of them.',
    ).toMatch(/worktree/i);
  });
});

describe('lab-gh-extensions contract: AC7 — Copilot CLI hook events are not re-enumerated', () => {
  it('defers the event list to lab06 instead of carrying its own stale copy', () => {
    expect(
      lab(),
      'lab-gh-extensions enumerates five Copilot CLI hook events in its §4 callout. That is five of ' +
        'fourteen, and it duplicates a list lab06 owns and that this sentence already links.',
    ).not.toMatch(/`preToolUse`,\s*`postToolUse`/);
  });

  it('still points the reader at lab06 for the distinction', () => {
    expect(
      lab(),
      'the git-hook vs Copilot-CLI-hook distinction is the callout\'s whole point and must survive',
    ).toMatch(/lab06\.md/);
  });
});

describe('lab-gh-extensions contract: AC8 — frontmatter and pacing', () => {
  it('has frontmatter with title, lab_number and pace', () => {
    const parsed = matter(lab());
    expect(parsed.matter.length, 'lab-gh-extensions.md is missing its frontmatter block').toBeGreaterThan(0);
    for (const key of ['title', 'lab_number', 'pace']) {
      expect(parsed.data[key], `lab-gh-extensions.md is missing frontmatter key "${key}"`).toBeDefined();
    }
  });

  it('frontmatter pace and the inline callout state the same minutes', () => {
    const fm = matter(lab()).data as { pace?: { presenter_minutes?: number; self_paced_minutes?: number } };
    const callout = lab().match(/Presenter pace:\s*(\d+)\s*minutes?\s*\|\s*Self-paced:\s*(\d+)/);
    expect(callout, 'lab-gh-extensions is missing its inline "⏱️ Presenter pace: …" callout').not.toBeNull();
    expect(Number(callout![1]), 'presenter minutes disagree between frontmatter and the inline callout').toBe(
      fm.pace?.presenter_minutes,
    );
    expect(Number(callout![2]), 'self-paced minutes disagree between frontmatter and the inline callout').toBe(
      fm.pace?.self_paced_minutes,
    );
  });
});

describe('lab-gh-extensions contract: AC9 — cited repo paths resolve', () => {
  it('every backticked path into this repository exists on disk', () => {
    const candidates = [
      ...lab().matchAll(/`([A-Za-z0-9_./-]+\.(?:md|json|yaml|yml|sh|mjs|ts|js))`/g),
    ]
      .map((m) => m[1])
      .filter((p) => !p.includes('*') && !p.startsWith('~') && !p.includes('<'))
      .filter((p) => REPO_DIRS.test(p));

    const missing = [...new Set(candidates)].filter((rel) => !existsSync(join(ROOT, rel)));
    expect(missing, `lab-gh-extensions cites path(s) that do not exist: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('lab-gh-extensions contract: AC10 — the lesson survives', () => {
  it('still disambiguates the three things called "extension"', () => {
    const body = lab();
    expect(body).toMatch(/gh extension/);
    expect(body).toMatch(/lab-copilot-cli-extensions\.md/);
    expect(body).toMatch(/gh-aw/);
  });

  it('still offers the credential-free mock path', () => {
    expect(
      lab(),
      'the --mock path is what makes this lab runnable in a restricted room; it must not be lost',
    ).toMatch(/--mock/);
  });

  it('still warns that a local install is a symlink', () => {
    expect(lab()).toMatch(/symlink/i);
  });
});
