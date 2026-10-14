/**
 * AC21 — freeze guard for workshop/site/hackathon.html
 * (specs/005-teaching-spa.md §2 AC21; child issue 12).
 *
 *   Unless workshop/spa/docs/hackathon-retired.md exists, workshop/site/hackathon.html is
 *   present and its SHA-256 equals the value in workshop/spa/docs/hackathon-baseline.sha256.
 *
 * Release condition: the retirement record, and nothing else.
 *   - A rehearsal record (rehearsal-<YYYY-MM-DD>.md) never releases the guard, whatever its
 *     verdict. A PASS authorizes retirement (AC23); only the retirement record itself ends
 *     the freeze.
 *   - The guard keys on that file's existence at run time. Child issue 14 writes it in the same
 *     change that deletes the page, and this test then asserts nothing further (AC23 takes
 *     over) without needing an edit.
 *   - Only existence is tested here. That the record names a passing rehearsal is AC23's job.
 *
 * Line endings: AC21 says "its SHA-256" without saying of which bytes. The page is committed
 * with LF endings, but a core.autocrlf=true checkout (this repo's Windows default) holds the
 * same page with CRLF, so a raw hash differs per checkout and would be red on Linux CI. The
 * baseline is therefore the SHA-256 of the LF form (what
 * `git show HEAD:workshop/site/hackathon.html | sha256sum` prints), and the page is accepted in
 * exactly two byte forms: that LF form, or that LF form with every LF expanded to CRLF. Any
 * other difference (a changed byte, a stray CR, mixed endings) is a violation.
 *
 * The release-condition cases run against throwaway trees under os.tmpdir() with synthetic page
 * bytes. Nothing is created in the repo, and they keep passing after the real page is retired.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

// Anchored to this file rather than the cwd, so the guard reads the same tree however vitest
// is invoked.
const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const PAGE = 'workshop/site/hackathon.html';
const DOCS = 'workshop/spa/docs';
const BASELINE = `${DOCS}/hackathon-baseline.sha256`;
const RETIREMENT_RECORD = `${DOCS}/hackathon-retired.md`;

// ---- the guard -----------------------------------------------------------------------------

interface Violation {
  code: 'page-missing' | 'page-changed' | 'baseline-missing' | 'baseline-malformed';
  detail: string;
}

interface Verdict {
  released: boolean;
  violations: Violation[];
}

const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

// latin1 maps each byte to one code unit, so both conversions are lossless for any content.
const toLf = (bytes: Buffer): Buffer =>
  Buffer.from(bytes.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
const toCrlf = (lf: Buffer): Buffer =>
  Buffer.from(lf.toString('latin1').replace(/\n/g, '\r\n'), 'latin1');

const isFile = (path: string): boolean => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

/** The value AC21 records for a page: the SHA-256 of its LF form. */
const baselineDigest = (page: Buffer): string => sha256(toLf(page));

function readBaseline(root: string): { digest?: string; violation?: Violation } {
  const path = join(root, BASELINE);
  if (!isFile(path)) {
    return { violation: { code: 'baseline-missing', detail: `${BASELINE} is absent` } };
  }
  const values = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
  const [value, ...rest] = values;
  if (value === undefined || rest.length > 0 || !/^[0-9a-f]{64}$/i.test(value)) {
    return {
      violation: {
        code: 'baseline-malformed',
        detail: `${BASELINE} must hold exactly one SHA-256 hex digest (lines starting # are comments)`,
      },
    };
  }
  return { digest: value.toLowerCase() };
}

function evaluateFreeze(root: string): Verdict {
  // The release condition: the retirement record is a file. Nothing else releases the guard,
  // and in particular no rehearsal record does, whatever its verdict.
  if (isFile(join(root, RETIREMENT_RECORD))) return { released: true, violations: [] };

  const violations: Violation[] = [];
  const baseline = readBaseline(root);
  if (baseline.violation) violations.push(baseline.violation);

  const pagePath = join(root, PAGE);
  if (!isFile(pagePath)) {
    violations.push({ code: 'page-missing', detail: `${PAGE} is absent` });
  } else if (baseline.digest !== undefined) {
    const bytes = readFileSync(pagePath);
    const lf = toLf(bytes);
    const actual = sha256(lf);
    const endingsUniform = bytes.equals(lf) || bytes.equals(toCrlf(lf));
    if (actual !== baseline.digest || !endingsUniform) {
      violations.push({
        code: 'page-changed',
        detail:
          `${PAGE} has SHA-256 ${actual} (LF form), baseline is ${baseline.digest}` +
          (endingsUniform ? '' : '; its line endings are neither all LF nor all CRLF'),
      });
    }
  }
  return { released: false, violations };
}

// ---- fixture trees -------------------------------------------------------------------------

// Multi-byte UTF-8 (em dash, right quote, check mark) so the byte handling is exercised.
const PAGE_LF = Buffer.from(
  '<!doctype html>\n<title>Hackathon</title>\n<p>Build \u2014 don\u2019t read \u2713</p>\n',
  'utf8',
);
const DIGEST = baselineDigest(PAGE_LF);

/** One byte different from the input. */
const edited = (bytes: Buffer): Buffer =>
  Buffer.from(bytes.toString('latin1').replace('Hackathon', 'Hackathom'), 'latin1');

const rehearsal = (verdict: 'PASS' | 'FAIL'): string =>
  '# Rehearsal 2026-11-02\n\n## Environment\n\nWindows 11\n\n## What was presented\n\n' +
  `The Teaching SPA\n\n## Defects found\n\nNone recorded\n\n## Verdict\n\n${verdict}: fixture\n`;

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

interface TreeOptions {
  /** The page bytes; null leaves the page absent. Defaults to the intact LF page. */
  page?: Buffer | null;
  /** The baseline file's text; null leaves it absent. Defaults to the page's digest. */
  baseline?: string | null;
  /** Extra files, keyed by path relative to the repo root. */
  files?: Record<string, string>;
}

/** Builds a throwaway repo-shaped tree and returns its root. */
function tree({
  page = PAGE_LF,
  baseline = `${DIGEST}\n`,
  files = {},
}: TreeOptions = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'spa-ac21-'));
  scratch.push(root);
  const put = (rel: string, content: string | Buffer): void => {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  };
  if (page !== null) put(PAGE, page);
  if (baseline !== null) put(BASELINE, baseline);
  for (const [rel, content] of Object.entries(files)) put(rel, content);
  return root;
}

const codes = (root: string): string[] => evaluateFreeze(root).violations.map((v) => v.code);

/**
 * The guard stays armed with `files` present: an intact page passes, and a changed or a deleted
 * page is still reported — the extra files neither release the guard nor excuse the page.
 */
function expectArmedDespite(files: Record<string, string>): void {
  expect(evaluateFreeze(tree({ files }))).toEqual({ released: false, violations: [] });
  expect(codes(tree({ files, page: edited(PAGE_LF) }))).toEqual(['page-changed']);
  expect(codes(tree({ files, page: null }))).toEqual(['page-missing']);
}

// ---- tests ---------------------------------------------------------------------------------

describe('AC21 — freeze guard for workshop/site/hackathon.html', () => {
  describe('the real tree', () => {
    it('unless hackathon-retired.md exists, hackathon.html is present and its SHA-256 equals the recorded baseline', () => {
      // Once hackathon-retired.md exists the guard is released and reports nothing.
      expect(evaluateFreeze(REPO_ROOT).violations).toEqual([]);
    });
  });

  describe('while armed (no retirement record)', () => {
    it('holds for an intact page', () => {
      expect(evaluateFreeze(tree())).toEqual({ released: false, violations: [] });
    });

    it('is violated by a one-byte change to the page', () => {
      expect(codes(tree({ page: edited(PAGE_LF) }))).toEqual(['page-changed']);
    });

    it('is violated when the page is absent', () => {
      expect(codes(tree({ page: null }))).toEqual(['page-missing']);
    });

    it('is violated when the baseline is absent, or is not exactly one SHA-256 digest', () => {
      expect(codes(tree({ baseline: null }))).toEqual(['baseline-missing']);
      for (const baseline of [
        '',
        '# only a comment\n',
        'not-a-digest\n',
        `${DIGEST.slice(1)}\n`,
        `${DIGEST}\n${DIGEST}\n`,
      ]) {
        expect(codes(tree({ baseline }))).toEqual(['baseline-malformed']);
      }
    });

    it('reads the baseline through comments, blank lines, CRLF endings and upper case', () => {
      const baseline = `# note\r\n\r\n  ${DIGEST.toUpperCase()}  \r\n`;
      expect(evaluateFreeze(tree({ baseline }))).toEqual({ released: false, violations: [] });
    });
  });

  describe('release condition: the retirement record, and nothing else', () => {
    it('a rehearsal-*.md with verdict PASS leaves the guard armed', () => {
      expectArmedDespite({ [`${DOCS}/rehearsal-2026-11-02.md`]: rehearsal('PASS') });
    });

    it('a rehearsal-*.md with verdict FAIL leaves the guard armed', () => {
      expectArmedDespite({ [`${DOCS}/rehearsal-2026-11-02.md`]: rehearsal('FAIL') });
    });

    it('any number of rehearsal records, in any mix of verdicts, leave the guard armed', () => {
      expectArmedDespite({
        [`${DOCS}/rehearsal-2026-11-02.md`]: rehearsal('FAIL'),
        [`${DOCS}/rehearsal-2026-11-09.md`]: rehearsal('PASS'),
        [`${DOCS}/rehearsal-2026-11-16.md`]: rehearsal('PASS'),
      });
    });

    it.each([
      ['a backup copy of the record', `${DOCS}/hackathon-retired.md.bak`],
      ['a differently named record', `${DOCS}/hackathon-retirement.md`],
      ['the record one directory up', 'workshop/spa/hackathon-retired.md'],
      ['the record at the repo root', 'hackathon-retired.md'],
    ])('a near miss does not release it: %s', (_label, path) => {
      expectArmedDespite({ [path]: 'Retired.\n' });
    });

    it('a directory named hackathon-retired.md is not the record and does not release it', () => {
      const root = tree({ page: edited(PAGE_LF) });
      mkdirSync(join(root, RETIREMENT_RECORD), { recursive: true });
      expect(evaluateFreeze(root).released).toBe(false);
      expect(codes(root)).toEqual(['page-changed']);
    });

    it('hackathon-retired.md releases it: the page may then be deleted or changed (child issue 14)', () => {
      const files = {
        [RETIREMENT_RECORD]: 'Retired; see rehearsal-2026-11-02.md.\n',
        [`${DOCS}/rehearsal-2026-11-02.md`]: rehearsal('PASS'),
      };
      const released = { released: true, violations: [] };
      expect(evaluateFreeze(tree({ files, page: null }))).toEqual(released);
      expect(evaluateFreeze(tree({ files, page: edited(PAGE_LF) }))).toEqual(released);
      expect(evaluateFreeze(tree({ files, page: null, baseline: null }))).toEqual(released);
    });

    it('keys on the record existing, not on its content or on any rehearsal (what it must say is AC23)', () => {
      const released = { released: true, violations: [] };
      expect(evaluateFreeze(tree({ files: { [RETIREMENT_RECORD]: '' }, page: null }))).toEqual(
        released,
      );
    });
  });

  describe('line endings', () => {
    it('accepts the page as committed (LF) and as a core.autocrlf=true checkout (CRLF)', () => {
      expect(codes(tree({ page: PAGE_LF }))).toEqual([]);
      expect(codes(tree({ page: toCrlf(PAGE_LF) }))).toEqual([]);
    });

    it('still catches a one-byte change in either form', () => {
      expect(codes(tree({ page: edited(PAGE_LF) }))).toEqual(['page-changed']);
      expect(codes(tree({ page: edited(toCrlf(PAGE_LF)) }))).toEqual(['page-changed']);
    });

    it('rejects a page that mixes LF and CRLF, and one with a stray CR', () => {
      const mixed = Buffer.from(PAGE_LF.toString('latin1').replace('\n', '\r\n'), 'latin1');
      const stray = Buffer.concat([PAGE_LF, Buffer.from('\r')]);
      expect(codes(tree({ page: mixed }))).toEqual(['page-changed']);
      expect(codes(tree({ page: stray }))).toEqual(['page-changed']);
    });
  });
});
