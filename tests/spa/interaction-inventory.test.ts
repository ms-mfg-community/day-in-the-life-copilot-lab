// AC6 (specs/005-teaching-spa.md section 2, issues 4 and 5): every `id` in workshop/spa/content/interactions.json is
// present in the built DOM carrying the ARIA role set its declared `pattern` requires, and every declared `pattern` is one
// of the patterns section 2.4 names. There is no filter and no skip list: whatever the inventory declares is checked, and
// the inventory declares all nine patterns (issue 4 built five, issue 5 the other four).
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
  PART_TWO,
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

  it('declares all four patterns of part 2 (parameter-chart, node-diagram, carousel, segment-timer)', () => {
    const declared = new Set(inventory.map((entry) => entry.pattern));
    for (const pattern of PART_TWO) expect(declared, pattern).toContain(pattern);
  });

  it('declares each of the nine patterns of section 2.4, and no other', () => {
    const declared = [...new Set(inventory.map((entry) => entry.pattern))].sort();
    expect(declared).toEqual([...specPatterns].sort());
    expect(declared).toEqual([...PART_ONE, ...PART_TWO].sort());
  });

  it('turns the status region on where the schema requires it: a staged reveal, a parameter chart and a segment timer', () => {
    for (const pattern of ['staged-reveal', 'parameter-chart', 'segment-timer']) {
      for (const entry of inventory.filter((candidate) => candidate.pattern === pattern)) expect(entry.statusRegion, entry.id).toBe(true);
    }
  });

  it('declares a long description for every chart and diagram, as the schema requires (AC19)', () => {
    for (const pattern of ['parameter-chart', 'node-diagram']) {
      for (const entry of inventory.filter((candidate) => candidate.pattern === pattern)) {
        expect(entry.longDescriptionId ?? '', entry.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }
    }
  });

  it('names the dataset a parameter chart draws on', () => {
    for (const entry of inventory.filter((candidate) => candidate.pattern === 'parameter-chart')) {
      expect(entry.dataset ?? '', entry.id).not.toBe('');
    }
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

/** The element the first button of an interaction controls (a popover, a diagram's details), wherever it currently sits. */
const controlledBy = (root: FakeElement): FakeElement => {
  const id = first(root, 'button').getAttribute('aria-controls');
  const found = id === null ? null : (root.ownerDocument?.getElementById(id) ?? null);
  if (found === null) throw new Error('negative control: the controlled element is not reachable');
  return found;
};

/** The long description a chart or diagram points at with aria-describedby, wherever it currently sits. */
const descriptionOf = (root: FakeElement): FakeElement => {
  const id = (root.getAttribute('aria-describedby') ?? '').split(/\s+/)[0];
  const found = root.ownerDocument?.getElementById(id) ?? null;
  if (found === null) throw new Error('negative control: the long description is not reachable');
  return found;
};

/** The element that holds the slides of a carousel. */
const wrapperOf = (root: FakeElement): FakeElement => {
  const parent = first(root, '[aria-roledescription="slide"]').parentElement;
  if (parent === null) throw new Error('negative control: the slides have no wrapper');
  return parent;
};

/** The first button whose caption starts with a word. */
const buttonStarting = (root: FakeElement, word: string): FakeElement => {
  const found = within(root, 'button').find((button) => button.textContent.trim().toLowerCase().startsWith(word));
  if (found === undefined) throw new Error(`negative control: no ${word} button`);
  return found;
};

/** Takes away both ways an author names an element. */
const unname = (el: FakeElement): void => {
  el.removeAttribute('aria-label');
  el.removeAttribute('aria-labelledby');
};

/** Breaks the shell's status region, which an entry with statusRegion=true announces to. */
const breakStatusRegion = (root: FakeElement): void => root.ownerDocument?.getElementById('live-region')?.removeAttribute('role');

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
  { name: 'the popover leaves the interaction', pattern: 'disclosure-popover', apply: (root) => root.after(controlledBy(root)), expected: /not inside the interaction/ },
  { name: 'aria-expanded says open while the popover is hidden', pattern: 'disclosure-popover', apply: (root) => first(root, 'button').setAttribute('aria-expanded', 'true'), expected: /disagrees with aria-expanded/ },

  { name: 'the group loses its name', pattern: 'parameter-chart', apply: unname, expected: /role=group named/ },
  { name: 'a slider loses its name', pattern: 'parameter-chart', apply: (root) => unname(first(root, '[role="slider"]')), expected: /no accessible name/ },
  { name: 'a slider leaves the tab order', pattern: 'parameter-chart', apply: (root) => first(root, '[role="slider"]').removeAttribute('tabindex'), expected: /not in the tab order/ },
  { name: 'aria-valuenow leaves its range', pattern: 'parameter-chart', apply: (root) => first(root, '[role="slider"]').setAttribute('aria-valuenow', '-1'), expected: /outside/ },
  { name: 'aria-valuenow is not a number', pattern: 'parameter-chart', apply: (root) => first(root, '[role="slider"]').setAttribute('aria-valuenow', 'lots'), expected: /numeric/ },
  { name: 'no parameter has the slider role', pattern: 'parameter-chart', apply: (root) => within(root, '[role="slider"]').forEach((slider) => slider.removeAttribute('role')), expected: /no parameter can be set/ },
  { name: 'the step buttons are gone', pattern: 'parameter-chart', apply: (root) => within(root, 'button').forEach((button) => button.remove()), expected: /no single-pointer way/ },
  { name: 'the long description loses its association', pattern: 'parameter-chart', apply: (root) => root.removeAttribute('aria-describedby'), expected: /nothing associates/ },
  { name: 'the long description is hidden', pattern: 'parameter-chart', apply: (root) => descriptionOf(root).setAttribute('hidden', ''), expected: /not reachable: it is hidden/ },
  { name: 'the shell status region is not a status', pattern: 'parameter-chart', apply: breakStatusRegion, expected: /no polite status region/ },

  { name: 'the diagram loses its name', pattern: 'node-diagram', apply: unname, expected: /role=group named/ },
  { name: 'two nodes are selected', pattern: 'node-diagram', apply: (root) => within(root, 'button')[1].setAttribute('aria-pressed', 'true'), expected: /exactly one selected node/ },
  { name: 'no node is selected', pattern: 'node-diagram', apply: (root) => within(root, 'button').forEach((node) => node.setAttribute('aria-pressed', 'false')), expected: /exactly one selected node/ },
  { name: 'aria-pressed is not true or false', pattern: 'node-diagram', apply: (root) => within(root, 'button')[1].setAttribute('aria-pressed', 'maybe'), expected: /aria-pressed true\/false/ },
  { name: 'a node loses aria-pressed', pattern: 'node-diagram', apply: (root) => within(root, 'button')[1].removeAttribute('aria-pressed'), expected: /aria-pressed true\/false/ },
  { name: 'two nodes are in the tab order', pattern: 'node-diagram', apply: (root) => within(root, 'button')[1].setAttribute('tabindex', '0'), expected: /exactly one node in the tab order/ },
  { name: 'a node loses aria-controls', pattern: 'node-diagram', apply: (root) => within(root, 'button')[1].removeAttribute('aria-controls'), expected: /no aria-controls pointing at the details/ },
  { name: 'the details are hidden', pattern: 'node-diagram', apply: (root) => controlledBy(root).setAttribute('hidden', ''), expected: /are not visible: it is hidden/ },
  { name: 'the details are empty', pattern: 'node-diagram', apply: (root) => void (controlledBy(root).textContent = ''), expected: /details .* are empty/ },
  { name: 'a node has no name', pattern: 'node-diagram', apply: (root) => void (within(root, 'button')[1].textContent = ''), expected: /has no name/ },
  { name: 'the long description id is gone', pattern: 'node-diagram', apply: (root) => descriptionOf(root).removeAttribute('id'), expected: /long description #\S+ is not in the DOM/ },
  { name: 'the long description is empty', pattern: 'node-diagram', apply: (root) => void (descriptionOf(root).textContent = ''), expected: /long description #\S+ is empty/ },

  { name: 'the container loses aria-roledescription', pattern: 'carousel', apply: (root) => root.removeAttribute('aria-roledescription'), expected: /aria-roledescription="carousel"/ },
  { name: 'the container takes another role', pattern: 'carousel', apply: (root) => root.setAttribute('role', 'list'), expected: /role=region or role=group/ },
  { name: 'the container loses its name', pattern: 'carousel', apply: unname, expected: /the carousel is named ""/ },
  { name: 'a slide loses its name', pattern: 'carousel', apply: (root) => unname(first(root, '[aria-roledescription="slide"]')), expected: /no accessible name/ },
  { name: 'a slide loses its role description', pattern: 'carousel', apply: (root) => first(root, '[aria-roledescription="slide"]').removeAttribute('aria-roledescription'), expected: /that is not a slide/ },
  { name: 'a slide is not a group', pattern: 'carousel', apply: (root) => first(root, '[aria-roledescription="slide"]').removeAttribute('role'), expected: /not a role=group/ },
  { name: 'the slide wrapper stops being polite', pattern: 'carousel', apply: (root) => wrapperOf(root).setAttribute('aria-live', 'off'), expected: /must be polite/ },
  { name: 'every slide is shown', pattern: 'carousel', apply: (root) => within(root, '[aria-roledescription="slide"]').forEach((slide) => slide.removeAttribute('hidden')), expected: /exactly one slide shown/ },
  { name: 'the previous and next buttons are gone', pattern: 'carousel', apply: (root) => within(root, 'button').forEach((button) => button.remove()), expected: /previous and next buttons/ },
  { name: 'a slide control loses aria-controls', pattern: 'carousel', apply: (root) => first(root, 'button').removeAttribute('aria-controls'), expected: /no aria-controls pointing at the slide wrapper/ },
  { name: 'a slide control moves into the live wrapper', pattern: 'carousel', apply: (root) => wrapperOf(root).append(first(root, 'button')), expected: /inside the live slide wrapper/ },

  { name: 'the group loses its name', pattern: 'segment-timer', apply: unname, expected: /role=group named/ },
  { name: 'the start control is gone', pattern: 'segment-timer', apply: (root) => buttonStarting(root, 'start').remove(), expected: /no start control/ },
  { name: 'the pause control is gone', pattern: 'segment-timer', apply: (root) => buttonStarting(root, 'pause').remove(), expected: /no pause control/ },
  { name: 'the stop control is gone', pattern: 'segment-timer', apply: (root) => buttonStarting(root, 'stop').remove(), expected: /no stop control/ },
  { name: 'the reset control is gone', pattern: 'segment-timer', apply: (root) => buttonStarting(root, 'reset').remove(), expected: /no reset control/ },
  { name: 'a control has no name', pattern: 'segment-timer', apply: (root) => void (first(root, 'button').textContent = ''), expected: /a timer control has no name/ },
  { name: 'the clock loses its role', pattern: 'segment-timer', apply: (root) => first(root, '[role="timer"]').removeAttribute('role'), expected: /expected one role=timer/ },
  { name: 'the clock loses its name', pattern: 'segment-timer', apply: (root) => unname(first(root, '[role="timer"]')), expected: /the clock has no accessible name/ },
  { name: 'the clock shows no time', pattern: 'segment-timer', apply: (root) => void (first(root, '[role="timer"]').textContent = ''), expected: /minutes:seconds/ },
  { name: 'the shell status region is not a status', pattern: 'segment-timer', apply: breakStatusRegion, expected: /no polite status region/ },
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
      pattern: 'synthetic-unknown-pattern',
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

  it('has a source file for each of the nine patterns', () => {
    const files = readdirSync(sourceDir).filter((name) => name.endsWith('.ts'));
    for (const pattern of [...PART_ONE, ...PART_TWO]) expect(files, pattern).toContain(`${pattern}.ts`);
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
