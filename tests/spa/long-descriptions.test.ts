// AC19 (specs/005-teaching-spa.md sections 2.4 and 5, issue 5; F109): a complex image needs a short description plus a long
// description, a textual representation of the essential information the image conveys, structurally associated with it.
// Here that means: every `parameter-chart` and `node-diagram` of the inventory, and every other entry that declares a
// `longDescriptionId`, has
//   - an accessible name (the short description),
//   - a declared `longDescriptionId`,
//   - one element in the DOM carrying exactly that id,
//   - that says something (not empty, not just the name),
//   - that a reader can reach (not hidden, inert, aria-hidden or styled out of the page), and
//   - that the chart or diagram points at with aria-describedby.
// Nothing is skipped: the subjects are whatever the inventory declares, read from the shell as the dev server runs it
// (source) and from the artifact `npm run spa:build` produces (bundle). A check that cannot fail proves nothing, so the
// audit is also run against fixtures that break each requirement in turn, first on a minimal well-formed fixture (which
// proves the audit can pass) and then on the real pages (which proves it can notice in the page that ships).

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createBrowser, type FakeElement } from './helpers/fake-dom';
import {
  ariaName,
  auditLongDescription,
  bootFromBundle,
  bootFromSource,
  buildBundle,
  readInventory,
  removeBundle,
  type Booted,
  type Bundle,
  type Flavour,
  type InventoryEntry,
} from './helpers/interaction-harness';

const VISUALS = ['parameter-chart', 'node-diagram'];
const inventory = readInventory();
const subjects = inventory.filter((entry) => VISUALS.includes(entry.pattern) || entry.longDescriptionId !== undefined);

describe('what the inventory asks AC19 to check', () => {
  it('holds at least one chart and one diagram, so the checks below cannot pass on an empty set', () => {
    const patterns = new Set(subjects.map((entry) => entry.pattern));
    for (const pattern of VISUALS) expect(patterns, pattern).toContain(pattern);
  });

  it('includes every entry that declares a longDescriptionId, whatever its pattern', () => {
    for (const entry of inventory.filter((candidate) => candidate.longDescriptionId !== undefined)) expect(subjects, entry.id).toContain(entry);
  });

  it.each(subjects.map((entry) => [entry.id, entry] as const))('%s declares its long description', (_id, entry) => {
    expect(entry.longDescriptionId ?? '').toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('gives no two entries the same long description', () => {
    const ids = subjects.map((entry) => entry.longDescriptionId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each<Flavour>(['source', 'bundle'])('every chart, diagram and declared long description is in the built DOM (AC19, %s)', (flavour) => {
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

  it.each(subjects.map((entry) => [entry.id, entry] as const))('%s has an accessible name and a reachable, associated long description', async (_id, entry) => {
    await page.go(entry.segment);
    expect(auditLongDescription(page.document, entry)).toEqual([]);

    // The same facts read directly, so this test does not rest on the audit alone.
    const id = entry.longDescriptionId as string;
    const root = page.root(entry.id);
    const holders = page.document.querySelectorAll(`[id="${id}"]`);
    expect(holders, `exactly one element carries the id ${id}`).toHaveLength(1);
    expect(ariaName(root, page.document), 'the short description').toBe(entry.label);
    expect(holders[0].textContent.replace(/\s+/g, ' ').trim().length, 'the long description says something').toBeGreaterThan(0);
    expect(holders[0].closest('[hidden], [inert], [aria-hidden="true"]'), 'a reader can reach it').toBeNull();
    expect((root.getAttribute('aria-describedby') ?? '').split(/\s+/), 'the image is associated with it').toContain(id);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Negative controls

const labelled = (attributes: string): string => `<div id="c" role="group" aria-label="Chart" ${attributes}></div>`;

const WELL_FORMED = `${labelled('aria-describedby="d"')}<p id="d">The chart shows one value.</p>`;

const fixtures: Array<{ name: string; html: string; expected: RegExp; declares?: Partial<InventoryEntry> }> = [
  { name: 'no long description is declared', html: WELL_FORMED, declares: { longDescriptionId: undefined }, expected: /declares no longDescriptionId/ },
  { name: 'an empty long description id is declared', html: WELL_FORMED, declares: { longDescriptionId: '  ' }, expected: /declares no longDescriptionId/ },
  { name: 'the declared node is not in the DOM', html: labelled('aria-describedby="d"'), expected: /#d is not in the DOM/ },
  { name: 'the long description is empty', html: `${labelled('aria-describedby="d"')}<p id="d"></p>`, expected: /#d is empty/ },
  { name: 'the long description is only white space', html: `${labelled('aria-describedby="d"')}<p id="d">  \n  </p>`, expected: /#d is empty/ },
  { name: 'the long description only repeats the name', html: `${labelled('aria-describedby="d"')}<p id="d">chart</p>`, expected: /only repeats/ },
  { name: 'the long description is hidden', html: `${labelled('aria-describedby="d"')}<p id="d" hidden>The chart shows one value.</p>`, expected: /not reachable: it is hidden/ },
  { name: 'the long description is aria-hidden', html: `${labelled('aria-describedby="d"')}<p id="d" aria-hidden="true">The chart shows one value.</p>`, expected: /not reachable: it is aria-hidden/ },
  { name: 'the long description is inert', html: `${labelled('aria-describedby="d"')}<p id="d" inert>The chart shows one value.</p>`, expected: /not reachable: it is inert/ },
  { name: 'the long description is styled out of the page', html: `${labelled('aria-describedby="d"')}<p id="d" style="display: none">The chart shows one value.</p>`, expected: /not reachable: it is styled out of the page/ },
  { name: 'an ancestor of the long description is hidden', html: `${labelled('aria-describedby="d"')}<section hidden><p id="d">The chart shows one value.</p></section>`, expected: /ancestor <section> is hidden/ },
  { name: 'nothing associates the chart with it', html: `${labelled('')}<p id="d">The chart shows one value.</p>`, expected: /nothing associates/ },
  { name: 'the chart is associated with another element', html: `${labelled('aria-describedby="other"')}<p id="d">The chart shows one value.</p><p id="other">x</p>`, expected: /nothing associates/ },
  { name: 'two elements carry the id', html: `${labelled('aria-describedby="d"')}<p id="d">The chart shows one value.</p><p id="d">A copy.</p>`, expected: /ambiguous/ },
  { name: 'the chart has no accessible name', html: `<div id="c" role="group" aria-describedby="d"></div><p id="d">The chart shows one value.</p>`, expected: /no accessible name/ },
];

describe('the AC19 audit can fail (a minimal fixture)', () => {
  const entry: InventoryEntry = { id: 'c', pattern: 'parameter-chart', segment: 'm3-multi-agent', label: 'Chart', keys: ['Tab'], statusRegion: true, longDescriptionId: 'd' };

  it('passes a chart that has every part, so a failure below is the broken part and nothing else', () => {
    const browser = createBrowser(WELL_FORMED);
    expect(auditLongDescription(browser.document, entry)).toEqual([]);
  });

  it.each(fixtures.map((fixture) => [fixture.name, fixture] as const))('%s', (_name, fixture) => {
    const browser = createBrowser(fixture.html);
    const problems = auditLongDescription(browser.document, { ...entry, ...fixture.declares });
    expect(problems.length, 'the audit did not notice').toBeGreaterThan(0);
    expect(problems.join('\n')).toMatch(fixture.expected);
  });

  it('reports a chart that is not in the DOM at all', () => {
    expect(auditLongDescription(createBrowser('<div></div>').document, entry).join('\n')).toMatch(/the id is not in the DOM/);
  });
});

/** The long description a chart or diagram points at with aria-describedby. */
const descriptionOf = (root: FakeElement): FakeElement => {
  const found = root.ownerDocument?.getElementById((root.getAttribute('aria-describedby') ?? '').split(/\s+/)[0]) ?? null;
  if (found === null) throw new Error('negative control: the long description is not reachable');
  return found;
};

/** One way to break a page that passes: what the page does wrong, or what the inventory declares wrongly instead. */
interface Break {
  name: string;
  page?: (root: FakeElement, entry: InventoryEntry) => void;
  declares?: Partial<InventoryEntry>;
  expected: RegExp;
}

const breaks: Break[] = [
  { name: 'the entry declares no longDescriptionId', declares: { longDescriptionId: undefined }, expected: /declares no longDescriptionId/ },
  { name: 'the entry declares an empty longDescriptionId', declares: { longDescriptionId: '' }, expected: /declares no longDescriptionId/ },
  { name: 'the entry declares an id that no element has', declares: { longDescriptionId: 'no-such-description' }, expected: /#no-such-description is not in the DOM/ },
  { name: 'the long description node is removed', page: (root) => descriptionOf(root).remove(), expected: /is not in the DOM/ },
  { name: 'the long description node loses its id', page: (root) => descriptionOf(root).removeAttribute('id'), expected: /is not in the DOM/ },
  { name: 'the long description is hidden', page: (root) => descriptionOf(root).setAttribute('hidden', ''), expected: /not reachable: it is hidden/ },
  { name: 'an ancestor of the long description is hidden', page: (root) => (descriptionOf(root).parentElement as FakeElement).setAttribute('hidden', ''), expected: /not reachable: its ancestor/ },
  { name: 'the long description is aria-hidden', page: (root) => descriptionOf(root).setAttribute('aria-hidden', 'true'), expected: /not reachable: it is aria-hidden/ },
  { name: 'the long description is inert', page: (root) => descriptionOf(root).setAttribute('inert', ''), expected: /not reachable: it is inert/ },
  { name: 'the long description is styled out of the page', page: (root) => descriptionOf(root).setAttribute('style', 'display:none'), expected: /styled out of the page/ },
  {
    name: 'the long description is empty',
    page: (root) => {
      descriptionOf(root).textContent = '';
    },
    expected: /is empty/,
  },
  {
    name: 'the long description is only white space',
    page: (root) => {
      descriptionOf(root).textContent = ' \n ';
    },
    expected: /is empty/,
  },
  {
    name: 'the long description only repeats the name',
    page: (root, entry) => {
      descriptionOf(root).textContent = entry.label;
    },
    expected: /only repeats/,
  },
  { name: 'nothing associates the image with the long description', page: (root) => root.removeAttribute('aria-describedby'), expected: /nothing associates/ },
  { name: 'the image is associated with another element', page: (root) => root.setAttribute('aria-describedby', 'someone-else'), expected: /nothing associates/ },
  {
    name: 'two elements carry the declared id',
    page: (root, entry) => {
      const copy = (root.ownerDocument as NonNullable<FakeElement['ownerDocument']>).createElement('p');
      copy.setAttribute('id', entry.longDescriptionId as string);
      copy.textContent = 'A second element with the same id.';
      root.append(copy);
    },
    expected: /ambiguous/,
  },
  {
    name: 'the image has no accessible name',
    page: (root) => {
      root.removeAttribute('aria-label');
      root.removeAttribute('aria-labelledby');
    },
    expected: /no accessible name/,
  },
];

describe.each(VISUALS)('the AC19 audit can fail on the real %s', (pattern) => {
  let page: Booted | undefined;

  afterEach(() => {
    page?.cleanup();
    page = undefined;
  });

  it.each(breaks.map((item) => [item.name, item] as const))('%s', async (_name, item) => {
    const entry = inventory.find((candidate) => candidate.pattern === pattern) as InventoryEntry;
    expect(entry, `the inventory has no ${pattern} entry`).toBeDefined();
    page = await bootFromSource();
    await page.go(entry.segment);
    expect(auditLongDescription(page.document, entry), 'the page must pass the audit before it is broken').toEqual([]);
    item.page?.(page.root(entry.id), entry);
    const problems = auditLongDescription(page.document, { ...entry, ...item.declares });
    expect(problems.length, 'the audit did not notice').toBeGreaterThan(0);
    expect(problems.join('\n')).toMatch(item.expected);
  });
});
