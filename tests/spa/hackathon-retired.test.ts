/**
 * AC23 (specs/005-teaching-spa.md; child issue 14): unless workshop/spa/docs/hackathon-retired.md exists, this criterion asserts
 * nothing. Once it exists: it names a workshop/spa/docs/rehearsal-<YYYY-MM-DD>.md that exists and whose `## Verdict` section's
 * first word is PASS; workshop/site/hackathon.html is absent from the working tree; and no tracked file under workshop/, scripts/
 * or docs/ references that path, other than the retirement's own records under workshop/spa/docs/.
 *
 * The two guards hand over to each other on the same file: hackathon-untouched.test.ts (AC21) is armed while the retirement
 * record is absent and silent once it exists; this one is the reverse. Tracked files are what `git ls-files` lists, so a stray
 * untracked copy neither passes nor fails the retirement; the reference looked for is the path itself, in any form of quoting.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readRecords } from './helpers/rehearsal-records';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PAGE = 'workshop/site/hackathon.html';
const DOCS = 'workshop/spa/docs';
const RETIREMENT_RECORD = `${DOCS}/hackathon-retired.md`;
const SURFACE = ['workshop/', 'scripts/', 'docs/'];
/** The retirement's own records, which name the path because they could not be written otherwise (spec section 1). */
const EXEMPT = new RegExp(`^${DOCS}/(hackathon-retired\\.md|hackathon-baseline\\.sha256|rehearsal-\\d{4}-\\d{2}-\\d{2}\\.md)$`);

const retired = existsSync(path.join(ROOT, RETIREMENT_RECORD));

/** Every tracked file under the surface, as git lists it. */
function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z', '--', ...SURFACE], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter((file) => file !== '');
}

describe('AC23 — the retirement of workshop/site/hackathon.html', () => {
  it(`asserts nothing while ${RETIREMENT_RECORD} does not exist, and everything once it does`, () => {
    expect(typeof retired).toBe('boolean');
  });

  describe.skipIf(!retired)('once the retirement record exists', () => {
    // Read here, not at collection time: a skipped describe still runs its body, and the record is absent until child issue 14.
    const text = retired ? readFileSync(path.join(ROOT, RETIREMENT_RECORD), 'utf8') : '';
    const named = Array.from(text.matchAll(/rehearsal-(\d{4}-\d{2}-\d{2})\.md/g), (match) => `rehearsal-${match[1]}.md`);

    it('names a rehearsal record that exists', () => {
      expect(named.length).toBeGreaterThan(0);
      for (const name of new Set(named)) expect(existsSync(path.join(ROOT, DOCS, name)), name).toBe(true);
    });

    it("the named rehearsal record's Verdict section begins with PASS", () => {
      const records = readRecords();
      for (const name of new Set(named)) {
        const record = records.find((candidate) => candidate.file === name);
        expect(record, name).toBeDefined();
        expect(record?.verdict, name).toBe('PASS');
      }
    });

    it('the page is absent from the working tree', () => {
      expect(existsSync(path.join(ROOT, PAGE))).toBe(false);
    });

    it('no tracked file under workshop/, scripts/ or docs/ references the path, other than the retirement records', () => {
      const offenders = trackedFiles()
        .filter((file) => !EXEMPT.test(file))
        .filter((file) => {
          const full = path.join(ROOT, file);
          return existsSync(full) && readFileSync(full, 'utf8').includes(PAGE);
        });
      expect(offenders).toEqual([]);
    });

    it('the page is not tracked either: a deletion that was not staged would come back with the next checkout', () => {
      expect(trackedFiles()).not.toContain(PAGE);
    });
  });
});
