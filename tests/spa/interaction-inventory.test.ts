// AC6 (specs/005-teaching-spa.md section 2, issue 4): every `id` in workshop/spa/content/interactions.json is present in
// the built DOM carrying the ARIA role set its declared `pattern` requires, and every declared `pattern` is one of the
// patterns section 2.4 names. There is no filter and no skip list: whatever the inventory declares is checked.
//
// "Built DOM" is read two ways, and both must pass: the shell as the dev server runs it (source) and the artifact
// `npm run spa:build` produces, executed from a fresh build. The fake DOM they run in is checked against real Chromium and
// Firefox by fake-dom-browser-check.mjs; interactions-browser-check.mjs runs the same AC6 audit in those browsers.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createBrowser, type FakeElement } from './helpers/fake-dom';
import {
  PART_ONE,
  ROOT,
  auditInteraction,
  bootFromBundle,
  bootFromSource,
  buildBundle,
  readDeckIds,
  readInventory,
  readSpecPatterns,
  removeBundle,
  segmentsFromPipeline,
  within,
  type Booted,
  type Bundle,
  type Flavour,
  type InventoryEntry,
} from './helpers/interaction-harness';

const inventory = readInventory();
const specPatterns = readSpecPatterns();

describe('the inventory and section 2.4 (AC6)', () => {
  it('section 2.4 names nine patterns', () => {
    expect(specPatterns).toEqual([
      'tabs',
      'accordion',
      'carousel',
      'dialog',
      'disclosure-popover',
      'parameter-chart',
      'node-diagram',
      'staged-reveal',
      'segment-timer',
    ]);
  });

  it('declares at least one interaction', () => {
    expect(inventory.length).toBeGreaterThan(0);
  });

  it.each(inventory.map((entry) => [entry.id, entry] as const))('%s declares a pattern section 2.4 names', (_id, entry) => {
    expect(specPatterns).toContain(entry.pattern);
  });

  it('declares each id once', () => {
    const ids = inventory.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps every interaction to a segment of the deck', () => {
    const deck = readDeckIds();
    for (const entry of inventory) expect(deck, `${entry.id} -> ${entry.segment}`).toContain(entry.segment);
  });

  it('declares all five patterns of part 1 (tabs, accordion, dialog, staged-reveal, disclosure-popover)', () => {
    const declared = new Set(inventory.map((entry) => entry.pattern));
    for (const pattern of PART_ONE) expect(declared, pattern).toContain(pattern);
  });

  it('turns the status region on for a staged reveal, as the schema requires', () => {
    for (const entry of inventory.filter((candidate) => candidate.pattern === 'staged-reveal')) expect(entry.statusRegion, entry.id).toBe(true);
  });
});

describe.each<Flavour>(['source', 'bundle'])('every inventory id is in the built DOM with its role set (AC6, %s)', (flavour) => {
  let bundle: Bundle | undefined;
  let page: Booted;

  beforeAll(async () => {
    if (flavour === 'bundle') bundle = buildBundle();
    page = flavour === 'bundle' ? await bootFromBundle(bundle as Bundle) : await bootFromSource();
  }, 120_000);

  afterAll(() => {
    page?.cleanup();
    if (bundle !== undefined) removeBundle(bundle);
  });

  it.each(inventory.map((entry) => [entry.id, entry] as const))('%s', async (_id, entry) => {
    await page.go(entry.segment);
    expect(auditInteraction(page.document, entry)).toEqual([]);
    expect(page.document.querySelectorAll(`#${entry.id}`)).toHaveLength(1);
  });

  it('keeps ids unique and every reference in a segment resolving, in every segment', async () => {
    for (const segment of readDeckIds()) {
      await page.go(segment);
      const ids = page.document.querySelectorAll('[id]').map((el) => el.id);
      expect(new Set(ids).size, `duplicate ids in ${segment}`).toBe(ids.length);
      for (const el of page.document.querySelectorAll('[aria-controls], [aria-labelledby], [aria-describedby]')) {
        for (const attribute of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
          for (const id of (el.getAttribute(attribute) ?? '').split(/\s+/).filter((value) => value !== '')) {
            expect(page.document.getElementById(id), `${segment}: ${attribute}="${id}" on ${el.localName}#${el.id}`).not.toBeNull();
          }
        }
      }
    }
  });

  it('leaves the shell contract alone: <main> holds the heading and one slide body, in every segment', async () => {
    for (const segment of readDeckIds()) {
      await page.go(segment);
      expect(page.main.children.map((child) => child.localName), segment).toEqual(['h1', 'div']);
    }
  });
});

// An audit that cannot fail proves nothing. Each row breaks one thing a pattern requires, in a page that passes, and the
// audit has to name it.
interface Mutation {
  name: string;
  pattern: string;
  apply: (root: FakeElement) => void;
  expected: RegExp;
}

const first = (root: FakeElement, selector: string): FakeElement => {
  const found = within(root, selector)[0];
  if (found === undefined) throw new Error(`negative control: ${selector} not found`);
  return found;
};

const element = (root: FakeElement, tag: string): FakeElement => {
  if (root.ownerDocument === null) throw new Error('negative control: the root has no document');
  return root.ownerDocument.createElement(tag);
};

/** The popover a disclosure trigger controls, wherever it currently sits. */
const popoverOf = (root: FakeElement): FakeElement => {
  const id = first(root, 'button').getAttribute('aria-controls');
  const found = id === null ? null : (root.ownerDocument?.getElementById(id) ?? null);
  if (found === null) throw new Error('negative control: the popover is not reachable');
  return found;
};

const mutations: Mutation[] = [
  { name: 'the id is gone', pattern: 'tabs', apply: (root) => root.remove(), expected: /not in the DOM/ },
  { name: 'a tab loses aria-controls', pattern: 'tabs', apply: (root) => first(root, '[role="tab"]').removeAttribute('aria-controls'), expected: /no aria-controls pointing at a tabpanel/ },
  { name: 'aria-selected is not true or false', pattern: 'tabs', apply: (root) => first(root, '[role="tab"]').setAttribute('aria-selected', 'maybe'), expected: /no aria-selected true\/false/ },
  { name: 'a tabpanel loses aria-labelledby', pattern: 'tabs', apply: (root) => first(root, '[role="tabpanel"]').removeAttribute('aria-labelledby'), expected: /aria-labelledby/ },
  { name: 'the tablist loses its label', pattern: 'tabs', apply: (root) => first(root, '[role="tablist"]').removeAttribute('aria-label'), expected: /tablist is named/ },
  { name: 'two tabs are selected', pattern: 'tabs', apply: (root) => within(root, '[role="tab"]')[1].setAttribute('aria-selected', 'true'), expected: /exactly one aria-selected=true/ },
  { name: 'an inactive tab is in the tab order', pattern: 'tabs', apply: (root) => within(root, '[role="tab"]')[1].setAttribute('tabindex', '0'), expected: /roving/ },
  { name: 'the tablist role is gone', pattern: 'tabs', apply: (root) => first(root, '[role="tablist"]').removeAttribute('role'), expected: /expected one tablist/ },
  { name: 'the active panel is not focusable', pattern: 'tabs', apply: (root) => first(root, '[role="tabpanel"]').removeAttribute('tabindex'), expected: /no tabindex=0/ },
  { name: 'a vertical orientation is claimed', pattern: 'tabs', apply: (root) => first(root, '[role="tablist"]').setAttribute('aria-orientation', 'vertical'), expected: /aria-orientation=vertical/ },

  { name: 'a header button shares its heading', pattern: 'accordion', apply: (root) => first(root, 'h2').append(element(root, 'span')), expected: /only child/ },
  { name: 'a header loses aria-expanded', pattern: 'accordion', apply: (root) => within(root, 'button')[1].removeAttribute('aria-expanded'), expected: /no aria-expanded/ },
  { name: 'a header loses aria-controls', pattern: 'accordion', apply: (root) => within(root, 'button')[1].removeAttribute('aria-controls'), expected: /no aria-controls/ },
  { name: 'aria-disabled is false', pattern: 'accordion', apply: (root) => within(root, 'button')[1].setAttribute('aria-disabled', 'false'), expected: /aria-disabled="false"/ },
  { name: 'a header is disabled outright', pattern: 'accordion', apply: (root) => within(root, 'button')[1].setAttribute('disabled', ''), expected: /is disabled/ },
  { name: 'the only open panel can be collapsed without aria-disabled', pattern: 'accordion', apply: (root) => first(root, 'button[aria-disabled]').removeAttribute('aria-disabled'), expected: /lacks aria-disabled=true/ },
  { name: 'the group loses its role', pattern: 'accordion', apply: (root) => root.removeAttribute('role'), expected: /role=group named/ },

  { name: 'the dialog is not modal', pattern: 'dialog', apply: (root) => first(root, '[role="dialog"]').removeAttribute('aria-modal'), expected: /aria-modal/ },
  { name: 'the dialog has no name', pattern: 'dialog', apply: (root) => first(root, '[role="dialog"]').removeAttribute('aria-labelledby'), expected: /dialog is named/ },
  { name: 'the dialog has no control', pattern: 'dialog', apply: (root) => within(root, '[role="dialog"] button').forEach((button) => button.remove()), expected: /no operating control/ },
  { name: 'the trigger loses aria-controls', pattern: 'dialog', apply: (root) => first(root, 'button[aria-haspopup]').removeAttribute('aria-controls'), expected: /trigger button with aria-controls/ },
  { name: 'the trigger loses aria-haspopup', pattern: 'dialog', apply: (root) => first(root, 'button[aria-haspopup]').removeAttribute('aria-haspopup'), expected: /aria-haspopup/ },
  { name: 'the dialog role is gone', pattern: 'dialog', apply: (root) => first(root, '[role="dialog"]').removeAttribute('role'), expected: /expected one role=dialog/ },

  { name: 'the control loses its group role', pattern: 'staged-reveal', apply: (root) => root.removeAttribute('role'), expected: /role=group named/ },
  { name: 'the stage buttons are gone', pattern: 'staged-reveal', apply: (root) => within(root, 'button').forEach((button) => button.remove()), expected: /previous and next buttons/ },

  { name: 'the trigger loses aria-expanded', pattern: 'disclosure-popover', apply: (root) => first(root, 'button').removeAttribute('aria-expanded'), expected: /expected one trigger button with aria-expanded/ },
  { name: 'the trigger loses aria-controls', pattern: 'disclosure-popover', apply: (root) => first(root, 'button').removeAttribute('aria-controls'), expected: /no aria-controls pointing at the popover/ },
  { name: 'the popover leaves the interaction', pattern: 'disclosure-popover', apply: (root) => root.after(popoverOf(root)), expected: /not inside the interaction/ },
  { name: 'aria-expanded says open while the popover is hidden', pattern: 'disclosure-popover', apply: (root) => first(root, 'button').setAttribute('aria-expanded', 'true'), expected: /disagrees with aria-expanded/ },
];

describe('the AC6 audit can fail (negative controls)', () => {
  let page: Booted | undefined;

  afterEach(() => {
    page?.cleanup();
    page = undefined;
  });

  it.each(mutations.map((mutation) => [`${mutation.pattern}: ${mutation.name}`, mutation] as const))('%s', async (_name, mutation) => {
    const entry = inventory.find((candidate) => candidate.pattern === mutation.pattern) as InventoryEntry;
    expect(entry, `the inventory has no ${mutation.pattern} entry`).toBeDefined();
    page = await bootFromSource();
    await page.go(entry.segment);
    expect(auditInteraction(page.document, entry), 'the page must pass the audit before it is broken').toEqual([]);
    mutation.apply(page.root(entry.id));
    const problems = auditInteraction(page.document, entry);
    expect(problems.length, 'the audit did not notice').toBeGreaterThan(0);
    expect(problems.join('\n')).toMatch(mutation.expected);
  });

  it('refuses a pattern it has no audit for rather than passing it', () => {
    const browser = createBrowser('<div id="x"></div>');
    const problems = auditInteraction(browser.document, {
      id: 'x',
      pattern: 'carousel',
      segment: 'm1-extensibility-architecture',
      label: 'x',
      keys: ['Tab'],
      statusRegion: false,
    });
    expect(problems.join('\n')).toMatch(/no audit exists/);
  });
});

// Requirement 3 of issue 4: no hand-copied curriculum prose in TypeScript. Content comes from the rendered slide (SPA-01
// and SPA-02 pipeline) or from segment metadata. A string literal of four words or more that also occurs in the text of
// a slide is prose that was copied instead of derived; labels, ARIA state names and button captions are shorter than that.
describe('the interaction sources carry no curriculum prose', () => {
  const sourceDir = path.join(ROOT, 'workshop/spa/src/interactions');

  function literalsOf(source: string): string[] {
    const found: string[] = [];
    for (const match of source.matchAll(/'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g)) {
      const body = match[1] ?? match[2] ?? match[3] ?? '';
      for (const part of body.split(/\$\{[^}]*\}/)) found.push(part.replace(/\\(.)/g, '$1'));
    }
    return found;
  }

  const normalise = (value: string): string => value.replace(/\s+/g, ' ').trim().toLowerCase();

  it('has a source file for each pattern of part 1', () => {
    const files = readdirSync(sourceDir).filter((name) => name.endsWith('.ts'));
    for (const pattern of PART_ONE) expect(files, pattern).toContain(`${pattern}.ts`);
  });

  it('copies no sentence of a slide into a string literal', () => {
    const scratch = createBrowser().document.createElement('div');
    const corpus = normalise(
      segmentsFromPipeline()
        .map((segment) => {
          scratch.innerHTML = segment.html;
          return `${segment.title} ${scratch.textContent}`;
        })
        .join(' '),
    );
    const offenders: string[] = [];
    for (const name of readdirSync(sourceDir).filter((file) => file.endsWith('.ts'))) {
      for (const literal of literalsOf(readFileSync(path.join(sourceDir, name), 'utf8'))) {
        const words = normalise(literal).split(' ').filter((word) => word !== '');
        if (words.length >= 4 && corpus.includes(normalise(literal))) offenders.push(`${name}: "${literal}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
