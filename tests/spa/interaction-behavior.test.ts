// Behaviour of the nine patterns of the interaction inventory (specs/005-teaching-spa.md sections 2.3, 2.4 and 2.10,
// AC6, AC13 and AC19): the key map of each pattern, state that outlives navigation (section 2.3), the live region, the
// Escape and focus-restoration rules for every modal and every hover/focus popover and, for part 2, the outputs a chart
// recomputes, the node a diagram selects, the slide a carousel shows and the life of a timer.
//
// The shell runs in the fake DOM of helpers/fake-dom.ts, which fake-dom-browser-check.mjs holds to the behaviour of
// real Chromium and Firefox. Each describe block runs over every inventory entry of its pattern, so an entry added
// later is held to the same rules without a new test. interactions-browser-check.mjs repeats the part 2 behaviour in
// the engines themselves, where layout, computed style and real clocks exist.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowser, tabOrder, type FakeElement, type Modifiers } from './helpers/fake-dom';
import {
  ariaName,
  bootFromSource,
  contentName,
  PART_TWO,
  readDeckIds,
  readInventory,
  ROOT,
  segmentsFromPipeline,
  within,
  type Booted,
  type InventoryEntry,
} from './helpers/interaction-harness';

const inventory = readInventory();

const cases = (pattern: string): Array<[string, InventoryEntry]> =>
  inventory.filter((entry) => entry.pattern === pattern).map((entry) => [entry.id, entry]);

const squash = (value: string): string => value.replace(/\s+/g, ' ').trim();

/** Text with every space removed: two renderings carry the same content when their characters agree, wherever they break. */
const flat = (value: string): string => value.replace(/\s+/g, '');

/** What an element's inline style declares, by property. The fake DOM has no layout, so a declaration is as far as it sees. */
function declared(element: FakeElement | null): Record<string, string> {
  const declarations: Record<string, string> = {};
  for (const declaration of (element?.getAttribute('style') ?? '').split(';')) {
    const colon = declaration.indexOf(':');
    if (colon > 0) declarations[declaration.slice(0, colon).trim().toLowerCase()] = declaration.slice(colon + 1).trim();
  }
  return declarations;
}

/** How much of what lies behind a CSS color it hides: 0 is nothing, 1 all of it. A color this does not recognise counts as opaque. */
function opacityOf(color: string | undefined): number {
  if (color === undefined || color === 'transparent') return 0;
  const alpha = /^rgba\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([\d.]+)\s*\)$/.exec(color);
  return alpha === null ? 1 : Number(alpha[1]);
}

function otherSegment(segmentId: string): string {
  const other = readDeckIds().find((id) => id !== segmentId);
  if (other === undefined) throw new Error('behaviour: the deck has only one segment');
  return other;
}

/** The slide a segment renders, parsed on its own, to compare the page with what the content pipeline produced. */
function slideOf(segmentId: string): FakeElement {
  const segment = segmentsFromPipeline().find((candidate) => candidate.id === segmentId);
  if (segment === undefined) throw new Error(`behaviour: no segment ${segmentId}`);
  const holder = createBrowser().document.createElement('div');
  holder.innerHTML = segment.html;
  return holder;
}

function byId(page: Booted, id: string | null): FakeElement {
  const found = id === null ? null : page.document.getElementById(id);
  if (found === null) throw new Error(`behaviour: no element with id ${id}`);
  return found;
}

const active = (page: Booted): FakeElement => page.document.activeElement;

function stored(page: Booted, entry: InventoryEntry): unknown {
  return page.spa.store.get().segments[entry.segment].parameters[entry.id];
}

function store(page: Booted, entry: InventoryEntry, value: unknown): void {
  page.spa.store.update(entry.segment, (state) => ({ ...state, parameters: { ...state.parameters, [entry.id]: value } }));
}

/** Boot the shell and open the entry's segment before each test; tear it down after. */
function usePage(entry: InventoryEntry, fakeTimers = false): () => Booted {
  let current: Booted | undefined;
  beforeEach(async () => {
    if (fakeTimers) vi.useFakeTimers();
    current = await bootFromSource();
    await current.go(entry.segment);
  });
  afterEach(() => {
    current?.cleanup();
    current = undefined;
    if (fakeTimers) vi.useRealTimers();
  });
  return () => {
    if (current === undefined) throw new Error('behaviour: the page is not booted');
    return current;
  };
}

/** Let the live region settle: the announcer defers its write by 50 ms. */
const settle = (): void => void vi.advanceTimersByTime(500);

/**
 * Whether `act` made an announcement. The announcer empties the live region at once and writes the message 50 ms later,
 * so a region that is empty right after `act` was written to, and one that still holds its old text was not. `act` must
 * not move the clock, or the write lands before the look.
 */
function announces(page: Booted, act: () => void): boolean {
  settle();
  if (page.liveRegion.textContent === '') throw new Error('behaviour: the live region holds nothing to tell an announcement from');
  act();
  return page.liveRegion.textContent === '';
}

/** A number as digits and a decimal point: a thousands separator is how a locale writes a number, not part of what it says. */
const ungrouped = (value: string): string => squash(value).replace(/(\d),(?=\d{3})/g, '$1');

/** Whether the text holds this number as a figure of its own, not as a piece of a longer one. */
function hasFigure(text: string, figure: number): boolean {
  const written = String(Number(figure.toFixed(3))).replace('.', '\\.');
  return new RegExp(`(^|[^\\d.])${written}(?![\\d]|\\.\\d)`).test(text);
}

// What a chart's dataset declares, read from the file and not from the page: the page is held to the data.
interface DatasetParameter {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly default: number;
}

interface Dataset {
  readonly provenance: { readonly kind: string; readonly note?: string };
  readonly parameters: readonly DatasetParameter[];
  readonly outputs: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly unit: string;
    readonly constant?: number;
    readonly terms: ReadonlyArray<{ readonly parameter: string; readonly coefficient: number }>;
  }>;
}

function datasetOf(entry: InventoryEntry): Dataset {
  if (entry.dataset === undefined) throw new Error(`behaviour: ${entry.id} names no dataset`);
  return JSON.parse(readFileSync(path.join(ROOT, 'workshop/spa/content/datasets', `${entry.dataset}.json`), 'utf8')) as Dataset;
}

/** Every output of the dataset at these parameter values: its constant plus each term's coefficient times its parameter. */
function outputsAt(model: Dataset, values: Readonly<Record<string, number>>): Record<string, number> {
  return Object.fromEntries(
    model.outputs.map((output) => [
      output.id,
      (output.constant ?? 0) + output.terms.reduce((sum, term) => sum + term.coefficient * values[term.parameter], 0),
    ]),
  );
}

/** The value a stored one means for a parameter: the nearest step of its range, or its default when it is no number at all. */
function allowed(parameter: DatasetParameter, stored: unknown): number {
  if (typeof stored !== 'number' || !Number.isFinite(stored)) return parameter.default;
  const stepped = parameter.min + Math.round((stored - parameter.min) / parameter.step) * parameter.step;
  return Math.min(parameter.max, Math.max(parameter.min, stepped));
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The relative luminance of a `#rrggbb` color (WCAG 2.2, SC 1.4.3). */
function luminance(color: string): number {
  const channels = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color.trim());
  if (channels === null) throw new Error(`behaviour: ${color} is not a #rrggbb color`);
  const [red, green, blue] = channels.slice(1).map((part) => {
    const channel = parseInt(part, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** The contrast ratio of two `#rrggbb` colors, from 1 to 21. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** The first `#rrggbb` color a declaration holds, such as the one in `3px solid #0b3d91`. */
function colorIn(declaration: string | undefined): string {
  const found = /#[0-9a-f]{6}\b/i.exec(declaration ?? '');
  if (found === null) throw new Error(`behaviour: no #rrggbb color in "${declaration}"`);
  return found[0];
}

/** The lists of a slide in which every item opens with a bold lead-in: how the tabs, the node diagram and the carousel read a slide. */
function leadInLists(slide: FakeElement): FakeElement[] {
  return slide.querySelectorAll('ul').filter((list) => {
    const items = list.children.filter((child) => child.localName === 'li');
    return items.length > 1 && items.every((item) => /^\s*<strong>/.test(item.innerHTML));
  });
}

/** What a list item opens with, and the rest of what it says. */
function splitItem(item: FakeElement): { leadIn: string; rest: string } {
  const leadIn = squash(item.querySelectorAll('strong')[0].textContent);
  return { leadIn, rest: squash(item.textContent).slice(leadIn.length).trim() };
}

/** The minutes the deck gives a segment. */
function minutesOf(segmentId: string): number {
  const segment = segmentsFromPipeline().find((candidate) => candidate.id === segmentId);
  if (segment === undefined) throw new Error(`behaviour: no segment ${segmentId}`);
  return segment.minutes;
}

// ---------------------------------------------------------------------------------------------------------------------
// tabs: APG tabs with automatic activation

describe.each(cases('tabs'))('tabs: %s', (_id, entry) => {
  const page = usePage(entry);
  const tabs = (): FakeElement[] => within(page().root(entry.id), '[role="tab"]');
  const panelOf = (tab: FakeElement): FakeElement => byId(page(), tab.getAttribute('aria-controls'));
  const selected = (): number => tabs().findIndex((tab) => tab.getAttribute('aria-selected') === 'true');

  it('starts on the first tab, with only its panel shown', () => {
    expect(selected()).toBe(0);
    tabs().forEach((tab, index) => expect(panelOf(tab).hidden, tab.id).toBe(index !== 0));
  });

  it('puts only the active tab in the page tab order, and Tab leaves the tablist for the panel', () => {
    const [first, ...others] = tabs();
    const order = tabOrder(page().document);
    expect(order).toContain(first);
    for (const tab of others) expect(order, tab.id).not.toContain(tab);
    first.focus();
    page().keyboard.press('Tab');
    expect(panelOf(first).contains(active(page()))).toBe(true);
  });

  it('Shift+Tab from the active tab leaves the tablist instead of visiting another tab', () => {
    const list = tabs();
    list[0].focus();
    page().keyboard.press('Tab', { shift: true });
    expect(list).not.toContain(active(page()));
  });

  it('moves focus with ArrowRight and ArrowLeft, activating the tab it lands on, and wraps at both ends', () => {
    const list = tabs();
    list[0].focus();
    list.slice(1).forEach((tab, offset) => {
      const down = page().keyboard.press('ArrowRight');
      expect(down.defaultPrevented).toBe(true);
      expect(active(page()), `after ${offset + 1} presses`).toBe(tab);
      expect(selected()).toBe(offset + 1);
      expect(panelOf(tab).hidden).toBe(false);
    });
    page().keyboard.press('ArrowRight');
    expect(active(page())).toBe(list[0]);
    expect(selected()).toBe(0);
    page().keyboard.press('ArrowLeft');
    expect(active(page())).toBe(list[list.length - 1]);
    expect(selected()).toBe(list.length - 1);
    page().keyboard.press('ArrowLeft');
    expect(active(page())).toBe(list[list.length - 2]);
    expect(selected()).toBe(list.length - 2);
  });

  it('shows exactly one panel after every move', () => {
    const list = tabs();
    list[0].focus();
    for (let press = 0; press < list.length * 2; press += 1) {
      page().keyboard.press('ArrowRight');
      expect(list.filter((tab) => !panelOf(tab).hidden)).toHaveLength(1);
    }
  });

  it('jumps to the first tab on Home and the last on End', () => {
    const list = tabs();
    list[1].focus();
    page().keyboard.press('End');
    expect(active(page())).toBe(list[list.length - 1]);
    expect(selected()).toBe(list.length - 1);
    page().keyboard.press('Home');
    expect(active(page())).toBe(list[0]);
    expect(selected()).toBe(0);
  });

  it.each(['ArrowUp', 'ArrowDown'])('does nothing on %s: the tablist is horizontal', (key) => {
    const list = tabs();
    list[0].focus();
    const down = page().keyboard.press(key);
    expect(down.defaultPrevented).toBe(false);
    expect(active(page())).toBe(list[0]);
    expect(selected()).toBe(0);
  });

  it.each<[string, Modifiers]>([
    ['Alt', { alt: true }],
    ['Ctrl', { ctrl: true }],
    ['Meta', { meta: true }],
    ['Shift', { shift: true }],
  ])('leaves %s+ArrowRight to the browser', (_name, modifiers) => {
    const list = tabs();
    list[0].focus();
    const down = page().keyboard.press('ArrowRight', modifiers);
    expect(down.defaultPrevented).toBe(false);
    expect(selected()).toBe(0);
  });

  it('keeps the tab order roving: the active tab has tabindex 0, the others -1', () => {
    const list = tabs();
    list[0].focus();
    page().keyboard.press('ArrowRight');
    expect(list.map((tab) => tab.getAttribute('tabindex'))).toEqual(list.map((_tab, index) => (index === 1 ? '0' : '-1')));
    expect(tabOrder(page().document).filter((el) => list.includes(el))).toEqual([list[1]]);
  });

  it('activates a tab, and focuses it, when it is clicked', () => {
    const list = tabs();
    page().pointer.click(list[2]);
    expect(selected()).toBe(2);
    expect(active(page())).toBe(list[2]);
    expect(panelOf(list[2]).hidden).toBe(false);
    expect(panelOf(list[0]).hidden).toBe(true);
  });

  it('QA regression: direct focus automatically activates a tab and persists its selection (F96)', () => {
    const list = tabs();
    // Focus may arrive from assistive technology, not just this widget's arrow handler or a click.
    for (const index of [1, list.length - 1, 0]) {
      list[index].focus();
      expect(active(page())).toBe(list[index]);
      expect(selected(), 'automatic activation must follow focus itself').toBe(index);
      expect(panelOf(list[index]).hidden).toBe(false);
      expect(list.map((tab) => tab.getAttribute('tabindex'))).toEqual(list.map((_tab, at) => (at === index ? '0' : '-1')));
      expect(stored(page(), entry)).toBe(index);
    }
  });

  it('gives the active panel tabindex 0 unless its first content can take focus itself', () => {
    const list = tabs();
    list[0].focus();
    for (let press = 0; press < list.length; press += 1) {
      const panel = panelOf(list[selected()]);
      const first = panel.firstElementChild;
      const focusable = first !== null && (['a', 'button', 'input', 'select', 'textarea'].includes(first.localName) || first.hasAttribute('tabindex'));
      expect(focusable || panel.getAttribute('tabindex') === '0', panel.id).toBe(true);
      page().keyboard.press('ArrowRight');
    }
  });

  it('remembers the active tab across navigation, in the store', async () => {
    const list = tabs();
    page().pointer.click(list[2]);
    expect(stored(page(), entry)).toBe(2);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expect(selected()).toBe(2);
    expect(panelOf(tabs()[2]).hidden).toBe(false);
    expect(page().spa.store.get().segments[otherSegment(entry.segment)].parameters[entry.id]).toBeUndefined();
  });

  it.each<[string, unknown]>([
    ['a string', 'banana'],
    ['a negative index', -1],
    ['an index past the end', 99],
    ['a fraction', 1.5],
    ['null', null],
    ['an object', {}],
  ])('opens the first tab when the stored state is %s', async (_name, garbage) => {
    store(page(), entry, garbage);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expect(selected()).toBe(0);
  });

  it('takes its tabs from the slide: each tab is named by the bold lead-in of a list item, and the panels hold the list as it was', () => {
    const slide = slideOf(entry.segment);
    const list = slide.querySelector('ul');
    if (list === null) throw new Error('the slide has no list');
    const items = list.children;
    const leadIns = slide.querySelectorAll('strong').map((strong) => squash(strong.textContent));
    expect(tabs()).toHaveLength(items.length);
    for (const tab of tabs()) expect(leadIns, tab.id).toContain(squash(contentName(tab, page().document)));
    expect(flat(tabs().map((tab) => panelOf(tab).textContent).join(' '))).toBe(flat(list.textContent));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// accordion: APG accordion, one panel always open

describe.each(cases('accordion'))('accordion: %s', (_id, entry) => {
  const page = usePage(entry);
  const headers = (): FakeElement[] => within(page().root(entry.id), 'button[aria-controls]');
  const panelOf = (header: FakeElement): FakeElement => byId(page(), header.getAttribute('aria-controls'));
  const open = (): number[] =>
    headers().flatMap((header, index) => (header.getAttribute('aria-expanded') === 'true' ? [index] : []));

  it('starts with the first panel open and the others collapsed', () => {
    expect(open()).toEqual([0]);
    headers().forEach((header, index) => expect(panelOf(header).hidden, header.id).toBe(index !== 0));
  });

  it('toggles the focused header on Enter and on Space, once each', () => {
    const list = headers();
    list[1].focus();
    const enter = page().keyboard.press('Enter');
    expect(open()).toEqual([0, 1]);
    expect(panelOf(list[1]).hidden).toBe(false);
    const space = page().keyboard.press(' ');
    expect(open()).toEqual([0]);
    expect(panelOf(list[1]).hidden).toBe(true);
    // the browser turns Enter and Space on a button into a click; handling the key as well would toggle twice
    expect(enter.defaultPrevented).toBe(false);
    expect(space.defaultPrevented).toBe(false);
  });

  it('toggles a header when it is clicked', () => {
    const list = headers();
    page().pointer.click(list[2]);
    expect(open()).toEqual([0, 2]);
    page().pointer.click(list[2]);
    expect(open()).toEqual([0]);
  });

  it('lets more than one panel be open at once', () => {
    const list = headers();
    list.slice(1, 4).forEach((header) => page().pointer.click(header));
    expect(open()).toEqual([0, 1, 2, 3]);
  });

  it('Tab and Shift+Tab visit every header button, in order', () => {
    const list = headers();
    list[0].focus();
    const forward = [list[0]];
    for (let presses = 0; active(page()) !== list[list.length - 1] && presses < 200; presses += 1) {
      page().keyboard.press('Tab');
      if (list.includes(active(page()))) forward.push(active(page()));
    }
    expect(forward).toEqual(list);
    const backward = [list[list.length - 1]];
    for (let presses = 0; active(page()) !== list[0] && presses < 200; presses += 1) {
      page().keyboard.press('Tab', { shift: true });
      if (list.includes(active(page()))) backward.push(active(page()));
    }
    expect(backward).toEqual([...list].reverse());
  });

  it('keeps the only open panel open: its header is aria-disabled and ignores activation, and no other header is', () => {
    const list = headers();
    expect(list.map((header) => header.getAttribute('aria-disabled'))).toEqual(list.map((_header, index) => (index === 0 ? 'true' : null)));
    page().pointer.click(list[0]);
    page().keyboard.press('Enter');
    expect(open()).toEqual([0]);
    expect(panelOf(list[0]).hidden).toBe(false);
  });

  it('moves aria-disabled to the last open panel when the others are collapsed', () => {
    const list = headers();
    page().pointer.click(list[2]);
    expect(list.map((header) => header.getAttribute('aria-disabled'))).toEqual(list.map(() => null));
    page().pointer.click(list[0]);
    expect(open()).toEqual([2]);
    expect(list[2].getAttribute('aria-disabled')).toBe('true');
    expect(list[0].getAttribute('aria-disabled')).toBeNull();
  });

  it('keeps an aria-disabled header in the tab order and focusable: it is not natively disabled', () => {
    const list = headers();
    expect(tabOrder(page().document)).toContain(list[0]);
    list[0].focus();
    expect(active(page())).toBe(list[0]);
  });

  it('keeps every panel hidden exactly when its header says collapsed', () => {
    const list = headers();
    for (const index of [3, 1, 3, 2, 0, 1]) {
      page().pointer.click(list[index]);
      for (const header of list) expect(panelOf(header).hidden, header.id).toBe(header.getAttribute('aria-expanded') !== 'true');
    }
  });

  it('remembers which panels are open across navigation, in the store', async () => {
    const list = headers();
    page().pointer.click(list[2]);
    page().pointer.click(list[3]);
    expect(stored(page(), entry)).toEqual([0, 2, 3]);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expect(open()).toEqual([0, 2, 3]);
    headers().forEach((header, index) => expect(panelOf(header).hidden, header.id).toBe(![0, 2, 3].includes(index)));
  });

  it.each<[string, unknown, number[]]>([
    ['a string', 'banana', [0]],
    ['an empty list', [], [0]],
    ['an index past the end', [99], [0]],
    ['negative and fractional indices', [-1, 1.5], [0]],
    ['an object', {}, [0]],
    ['a mix of valid and invalid indices', [1, 99, 1], [1]],
  ])('opens a sensible panel when the stored state is %s', async (_name, garbage, expected) => {
    store(page(), entry, garbage);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expect(open()).toEqual(expected);
  });

  it('turns the slide sections into the panels: header names and ids come from the h2 headings, the content is all still there', () => {
    const slide = slideOf(entry.segment);
    const headings = slide.querySelectorAll('h2');
    expect(headers().map((header) => squash(contentName(header, page().document)))).toEqual(headings.map((heading) => squash(heading.textContent)));
    expect(within(page().root(entry.id), 'h2').map((heading) => heading.id)).toEqual(headings.map((heading) => heading.id));
    const firstHeading = headings[0];
    const sectionText = slide.children
      .slice(slide.children.indexOf(firstHeading))
      .map((el) => el.textContent)
      .join(' ');
    expect(flat(page().root(entry.id).textContent)).toBe(flat(sectionText));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// dialog: APG modal dialog (AC13)

describe.each(cases('dialog'))('dialog: %s', (_id, entry) => {
  const page = usePage(entry);
  const trigger = (): FakeElement => within(page().root(entry.id), 'button[aria-haspopup]')[0];
  const dialog = (): FakeElement => within(page().root(entry.id), '[role="dialog"]')[0];
  const closeButton = (): FakeElement => {
    const found = within(dialog(), 'button').find((button) => /close/i.test(contentName(button, page().document)));
    if (found === undefined) throw new Error('the dialog has no close button');
    return found;
  };
  const isOpen = (): boolean => !dialog().hidden;
  const inertCount = (): number => page().document.querySelectorAll('[inert]').length;

  const openers: Array<[string, () => void]> = [
    ['a pointer click', () => page().pointer.click(trigger())],
    [
      'Enter',
      () => {
        trigger().focus();
        page().keyboard.press('Enter');
      },
    ],
    [
      'Space',
      () => {
        trigger().focus();
        page().keyboard.press(' ');
      },
    ],
  ];

  it('is closed at rest, with nothing inert and the trigger in the tab order', () => {
    expect(isOpen()).toBe(false);
    expect(inertCount()).toBe(0);
    expect(tabOrder(page().document)).toContain(trigger());
  });

  it.each(openers)('opened by %s: focus moves inside, and Escape closes it and returns focus to the exact trigger (AC13)', (_how, open) => {
    open();
    expect(isOpen()).toBe(true);
    expect(dialog().contains(active(page()))).toBe(true);
    const down = page().keyboard.press('Escape');
    expect(down.defaultPrevented).toBe(true);
    expect(isOpen()).toBe(false);
    expect(active(page())).toBe(trigger());
  });

  it.each(openers)('opened by %s: the close control closes it and returns focus to the exact trigger (AC13)', (_how, open) => {
    open();
    page().pointer.click(closeButton());
    expect(isOpen()).toBe(false);
    expect(active(page())).toBe(trigger());
  });

  it('closes on Enter on the close control, too', () => {
    openers[0][1]();
    closeButton().focus();
    page().keyboard.press('Enter');
    expect(isOpen()).toBe(false);
    expect(active(page())).toBe(trigger());
  });

  it('puts the first control of the dialog in focus when it opens', () => {
    openers[0][1]();
    expect(active(page())).toBe(tabOrder(page().document)[0]);
  });

  it('wraps Tab and Shift+Tab inside the open dialog, and never lets focus out (no keyboard trap beyond Escape, AC13)', () => {
    openers[0][1]();
    const order = tabOrder(page().document);
    expect(order.length).toBeGreaterThan(0);
    for (const el of order) expect(dialog().contains(el), `${el.localName} is tabbable outside the dialog`).toBe(true);
    for (let press = 0; press < order.length * 2 + 1; press += 1) {
      page().keyboard.press('Tab');
      expect(dialog().contains(active(page()))).toBe(true);
    }
    order[order.length - 1].focus();
    page().keyboard.press('Tab');
    expect(active(page())).toBe(order[0]);
    order[0].focus();
    page().keyboard.press('Tab', { shift: true });
    expect(active(page())).toBe(order[order.length - 1]);
  });

  it('puts the page behind it out of reach while open, and restores all of it on close', () => {
    openers[0][1]();
    expect(inertCount()).toBeGreaterThan(0);
    expect(tabOrder(page().document).every((el) => dialog().contains(el))).toBe(true);
    page().keyboard.press('Escape');
    expect(inertCount()).toBe(0);
    expect(tabOrder(page().document)).toContain(trigger());
  });

  it('regression: obscures the page behind it as well, which aria-modal="true" claims (F103): a dimming layer over the whole viewport, an opaque panel on top', () => {
    openers[0][1]();
    const layer = declared(dialog());
    expect(layer.position, 'the dialog must be taken out of the page flow to cover the page').toBe('fixed');
    for (const edge of ['top', 'right', 'bottom', 'left']) {
      expect(Number.parseFloat(layer[edge]), `the dimming layer reaches the ${edge} edge of the viewport`).toBe(0);
    }
    expect(Number(layer['z-index']), 'the layer lies above the page').toBeGreaterThan(0);
    expect(opacityOf(layer.background), 'the layer hides most of what lies behind it').toBeGreaterThanOrEqual(0.5);
    const panel = closeButton().parentElement;
    expect(panel, 'the controls sit in a panel of their own, inside the dialog').not.toBe(dialog());
    expect(dialog().contains(panel)).toBe(true);
    expect(opacityOf(declared(panel).background), 'the panel is opaque: the dialog stays readable over the dimmed page').toBe(1);
  });

  it('regression: declares no display of its own, so the hidden attribute still hides it while closed', () => {
    expect(isOpen()).toBe(false);
    expect(declared(dialog()).display, 'an author display beats the rule behind hidden').toBeUndefined();
  });

  it('still closes on Escape after a click on dead text inside it moved focus out of every control', () => {
    openers[0][1]();
    const title = byId(page(), dialog().getAttribute('aria-labelledby'));
    page().pointer.click(title);
    expect(dialog().contains(active(page()))).toBe(false);
    page().keyboard.press('Escape');
    expect(isOpen()).toBe(false);
    expect(active(page())).toBe(trigger());
  });

  it('keeps Tab inside the dialog even from that dead-text state', () => {
    openers[0][1]();
    page().pointer.click(byId(page(), dialog().getAttribute('aria-labelledby')));
    page().keyboard.press('Tab');
    expect(dialog().contains(active(page()))).toBe(true);
  });

  it('opens and closes again as often as asked, returning focus each time', () => {
    for (const [, open] of openers) {
      open();
      expect(isOpen()).toBe(true);
      page().keyboard.press('Escape');
      expect(isOpen()).toBe(false);
      expect(active(page())).toBe(trigger());
    }
  });

  it('holds no document listener while closed, so Escape elsewhere is not swallowed', () => {
    const before = page().document.listenerCount();
    openers[0][1]();
    expect(page().document.listenerCount()).toBeGreaterThan(before);
    page().keyboard.press('Escape');
    expect(page().document.listenerCount()).toBe(before);
    expect(page().keyboard.press('Escape').defaultPrevented).toBe(false);
  });

  it('closes cleanly when the segment changes underneath it', async () => {
    const before = page().document.listenerCount();
    openers[0][1]();
    await page().go(otherSegment(entry.segment));
    expect(page().document.listenerCount()).toBe(before);
    expect(inertCount()).toBe(0);
    await page().go(entry.segment);
    expect(isOpen()).toBe(false);
    expect(inertCount()).toBe(0);
  });

  it('shows the diagram of the slide: the dialog holds the same text as the slide <pre>', () => {
    const slide = slideOf(entry.segment);
    const source = slide.querySelector('pre');
    if (source === null) throw new Error('the slide has no <pre>');
    const copy = within(dialog(), 'pre')[0];
    expect(copy, 'the dialog has no <pre>').toBeDefined();
    expect(copy.textContent).toBe(source.textContent);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// staged-reveal: progressive steps backed by the store, announced to the live region

describe.each(cases('staged-reveal'))('staged-reveal: %s', (_id, entry) => {
  const page = usePage(entry, true);
  const control = (): FakeElement => page().root(entry.id);
  const button = (name: RegExp): FakeElement => {
    const found = within(control(), 'button').find((candidate) => name.test(contentName(candidate, page().document)));
    if (found === undefined) throw new Error(`no stage button named ${name}`);
    return found;
  };
  const previous = (): FakeElement => button(/previous|back/i);
  const next = (): FakeElement => button(/next|forward/i);
  const stage = (): number => page().spa.store.get().segments[entry.segment].revealedSteps;
  const total = (): number => slideOf(entry.segment).querySelectorAll('h2').length;
  const live = (): string => squash(page().liveRegion.textContent);

  /** Which stage each element of the slide body belongs to: a section is an h2 and what follows it; a rule belongs to the section it introduces. */
  function membership(): Array<{ el: FakeElement; stage: number }> {
    const body = control().parentElement;
    if (body === null) throw new Error('the control is detached');
    const siblings = body.children.filter((el) => el !== control());
    let headings = 0;
    return siblings.map((el, index) => {
      if (el.localName === 'h2') headings += 1;
      const introduces = el.localName === 'hr' && siblings[index + 1]?.localName === 'h2';
      return { el, stage: introduces ? headings + 1 : headings };
    });
  }

  function expectRevealed(count: number): void {
    for (const { el, stage: owner } of membership()) {
      expect(el.hidden, `${el.localName} of stage ${owner} with ${count} revealed`).toBe(owner > count);
    }
  }

  it('starts with the store at zero and none of the sections revealed, the control shown', () => {
    expect(stage()).toBe(0);
    expectRevealed(0);
    expect(control().hidden).toBe(false);
    expect(total()).toBeGreaterThan(1);
  });

  it('sits in the slide body between the heading and the first section, leaving <main> as heading plus body', () => {
    const body = control().parentElement as FakeElement;
    expect(page().main.children.map((child) => child.localName)).toEqual(['h1', 'div']);
    expect(page().main.children[1]).toBe(body);
    const order = body.children;
    expect(order.indexOf(control())).toBeLessThan(order.findIndex((el) => el.localName === 'h2'));
  });

  it('reveals one more section on ArrowRight and one fewer on ArrowLeft, through the store', () => {
    previous().focus();
    for (let count = 1; count <= 3; count += 1) {
      const down = page().keyboard.press('ArrowRight');
      expect(down.defaultPrevented).toBe(true);
      expect(stage()).toBe(count);
      expectRevealed(count);
    }
    page().keyboard.press('ArrowLeft');
    expect(stage()).toBe(2);
    expectRevealed(2);
  });

  it('reveals and hides with the buttons, by pointer and by keyboard, with no timer involved', () => {
    page().pointer.click(next());
    expect(stage()).toBe(1);
    next().focus();
    page().keyboard.press('Enter');
    expect(stage()).toBe(2);
    page().keyboard.press(' ');
    expect(stage()).toBe(3);
    page().pointer.click(previous());
    expect(stage()).toBe(2);
    expectRevealed(2);
  });

  it('stops at both ends instead of wrapping, and marks the spent button aria-disabled without disabling it', () => {
    expect(previous().getAttribute('aria-disabled')).toBe('true');
    expect(next().getAttribute('aria-disabled')).toBeNull();
    previous().focus();
    page().keyboard.press('ArrowLeft');
    page().pointer.click(previous());
    expect(stage()).toBe(0);
    for (let press = 0; press < total() + 3; press += 1) page().keyboard.press('ArrowRight');
    expect(stage()).toBe(total());
    expectRevealed(total());
    expect(page().main.querySelectorAll('[hidden]').filter((el) => el !== control())).toHaveLength(0);
    expect(next().getAttribute('aria-disabled')).toBe('true');
    expect(previous().getAttribute('aria-disabled')).toBeNull();
    expect(next().hasAttribute('disabled')).toBe(false);
    page().pointer.click(next());
    expect(stage()).toBe(total());
  });

  it('keeps focus on the control while it changes', () => {
    next().focus();
    for (let press = 0; press < total(); press += 1) page().keyboard.press('ArrowRight');
    expect(active(page())).toBe(next());
  });

  it('ignores the arrow keys with a modifier, which belong to the browser', () => {
    next().focus();
    for (const modifiers of [{ alt: true }, { ctrl: true }, { meta: true }]) {
      expect(page().keyboard.press('ArrowRight', modifiers).defaultPrevented).toBe(false);
    }
    expect(stage()).toBe(0);
  });

  it('survives navigating away and back: the store keeps the count and the page follows it', async () => {
    next().focus();
    for (let press = 0; press < 3; press += 1) page().keyboard.press('ArrowRight');
    await page().go(otherSegment(entry.segment));
    expect(page().spa.store.get().segments[entry.segment].revealedSteps).toBe(3);
    await page().go(entry.segment);
    expect(stage()).toBe(3);
    expectRevealed(3);
    expect(control().textContent).toMatch(/\b3\b/);
  });

  it('follows the store when something else changes it, as a presenter key will', () => {
    page().spa.store.update(entry.segment, (state) => ({ ...state, revealedSteps: 4 }));
    expectRevealed(4);
    expect(control().textContent).toMatch(/\b4\b/);
    page().spa.store.update(entry.segment, (state) => ({ ...state, revealedSteps: 0 }));
    expectRevealed(0);
  });

  it.each<[string, number]>([
    ['past the end', 9999],
    ['negative', -3],
  ])('shows a sensible stage when the store holds a count %s', async (_name, count) => {
    page().spa.store.update(entry.segment, (state) => ({ ...state, revealedSteps: count }));
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expectRevealed(Math.min(Math.max(count, 0), total()));
  });

  it('shows the current stage and the number of stages on the control', () => {
    expect(squash(control().textContent)).toMatch(new RegExp(`\\b0\\b.*\\b${total()}\\b`));
    next().focus();
    page().keyboard.press('ArrowRight');
    expect(squash(control().textContent)).toMatch(new RegExp(`\\b1\\b.*\\b${total()}\\b`));
  });

  it('announces the current stage to the live region when it changes, with the title of the section just revealed', () => {
    settle();
    const before = live();
    next().focus();
    page().keyboard.press('ArrowRight');
    settle();
    const heading = slideOf(entry.segment).querySelectorAll('h2')[0];
    expect(live()).not.toBe(before);
    expect(live()).toMatch(new RegExp(`\\b1\\b.*\\b${total()}\\b`));
    expect(live()).toContain(squash(heading.textContent));
  });

  it('announces the stage when it goes back, and when the store changes it from elsewhere', () => {
    next().focus();
    page().keyboard.press('ArrowRight');
    page().keyboard.press('ArrowRight');
    settle();
    page().keyboard.press('ArrowLeft');
    settle();
    expect(live()).toMatch(new RegExp(`\\b1\\b.*\\b${total()}\\b`));
    page().spa.store.update(entry.segment, (state) => ({ ...state, revealedSteps: 5 }));
    settle();
    expect(live()).toMatch(new RegExp(`\\b5\\b.*\\b${total()}\\b`));
  });

  it('announces stage zero when everything is hidden again', () => {
    next().focus();
    page().keyboard.press('ArrowRight');
    settle();
    page().keyboard.press('ArrowLeft');
    settle();
    expect(live()).toMatch(new RegExp(`\\b0\\b.*\\b${total()}\\b`));
  });

  it('says nothing when it is only mounted from state the store already holds', async () => {
    next().focus();
    for (let press = 0; press < 3; press += 1) page().keyboard.press('ArrowRight');
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    settle();
    expect(live()).toMatch(/^Segment \d+ of \d+/);
    expect(live()).not.toMatch(/\bstep\b/i);
  });

  it('says nothing when a spent button is pressed', () => {
    settle();
    const before = live();
    page().pointer.click(previous());
    settle();
    expect(stage()).toBe(0);
    expect(live()).toBe(before);
  });

  it('keeps all the slide text in the page, revealed or not', () => {
    const slide = slideOf(entry.segment);
    const rest = membership().map(({ el }) => el.textContent).join(' ');
    expect(flat(rest)).toBe(flat(slide.textContent));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// disclosure-popover: WCAG 1.4.13 (dismissible, hoverable, persistent) and AC13

describe.each(cases('disclosure-popover'))('disclosure-popover: %s', (_id, entry) => {
  const page = usePage(entry, true);
  const trigger = (): FakeElement => within(page().root(entry.id), 'button[aria-expanded]')[0];
  const popover = (): FakeElement => byId(page(), trigger().getAttribute('aria-controls'));
  const shown = (): boolean => !popover().hidden && trigger().getAttribute('aria-expanded') === 'true';
  const hidden = (): boolean => popover().hidden && trigger().getAttribute('aria-expanded') === 'false';
  const segment = () => {
    const found = segmentsFromPipeline().find((candidate) => candidate.id === entry.segment);
    if (found === undefined) throw new Error('no segment');
    return found;
  };

  it('is hidden at rest, and the trigger says so', () => {
    expect(hidden()).toBe(true);
  });

  it('reveals on pointer hover and hides when the pointer leaves', () => {
    page().pointer.moveTo(trigger());
    expect(shown()).toBe(true);
    page().pointer.moveTo(null);
    vi.advanceTimersByTime(1000);
    expect(hidden()).toBe(true);
  });

  it('is hoverable: moving the pointer from the trigger onto the popover keeps it open', () => {
    page().pointer.moveTo(trigger());
    page().pointer.moveTo(popover());
    vi.advanceTimersByTime(5000);
    expect(shown()).toBe(true);
    page().pointer.moveTo(null);
    vi.advanceTimersByTime(1000);
    expect(hidden()).toBe(true);
  });

  it('forgives a short trip across the gap between the trigger and the popover', () => {
    page().pointer.moveTo(trigger());
    page().pointer.moveTo(null);
    vi.advanceTimersByTime(20);
    page().pointer.moveTo(popover());
    vi.advanceTimersByTime(5000);
    expect(shown()).toBe(true);
  });

  it('is persistent: it stays while hovered, with no timer to take it away', () => {
    page().pointer.moveTo(trigger());
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(shown()).toBe(true);
  });

  it('reveals on keyboard focus, immediately, and hides when focus leaves', () => {
    trigger().focus();
    expect(shown()).toBe(true);
    page().main.focus();
    expect(hidden()).toBe(true);
  });

  it('reveals when Tab lands on the trigger and hides when Tab moves on', () => {
    const order = tabOrder(page().document);
    const index = order.indexOf(trigger());
    expect(index).toBeGreaterThanOrEqual(0);
    if (index > 0) order[index - 1].focus();
    else page().main.focus();
    page().keyboard.press('Tab');
    expect(active(page())).toBe(trigger());
    expect(shown()).toBe(true);
    page().keyboard.press('Tab');
    expect(hidden()).toBe(true);
  });

  it('keeps it open while focus moves from the trigger into the popover', () => {
    trigger().focus();
    page().pointer.click(popover());
    expect(popover().contains(active(page()))).toBe(true);
    expect(shown()).toBe(true);
  });

  it('is pinned open by activation, which touch and Safari need because they do not focus a button', () => {
    trigger().click();
    page().pointer.moveTo(null);
    vi.advanceTimersByTime(5000);
    expect(shown()).toBe(true);
    page().keyboard.press('Escape');
    expect(hidden()).toBe(true);
  });

  it('can be opened again after Escape by activating the trigger, without leaving focus', () => {
    trigger().focus();
    page().keyboard.press('Escape');
    expect(hidden()).toBe(true);
    page().keyboard.press('Enter');
    expect(shown()).toBe(true);
    expect(active(page())).toBe(trigger());
  });

  describe('Escape (AC13)', () => {
    it('dismisses a popover revealed by hover without moving the pointer or the focus', () => {
      page().pointer.moveTo(trigger());
      const focusBefore = active(page());
      const down = page().keyboard.press('Escape');
      expect(down.defaultPrevented).toBe(true);
      expect(hidden()).toBe(true);
      expect(page().pointer.hovered).toBe(trigger());
      expect(active(page())).toBe(focusBefore);
    });

    it('dismisses a popover revealed by focus and leaves the focus on the trigger', () => {
      trigger().focus();
      page().keyboard.press('Escape');
      expect(hidden()).toBe(true);
      expect(active(page())).toBe(trigger());
    });

    it('returns focus to the trigger when focus was inside the popover', () => {
      page().pointer.moveTo(trigger());
      page().pointer.click(popover());
      expect(popover().contains(active(page()))).toBe(true);
      page().keyboard.press('Escape');
      expect(hidden()).toBe(true);
      expect(active(page())).toBe(trigger());
    });

    it('stays dismissed while the pointer rests where it was, and comes back on the next hover', () => {
      page().pointer.moveTo(trigger());
      page().keyboard.press('Escape');
      vi.advanceTimersByTime(5000);
      expect(hidden()).toBe(true);
      page().pointer.moveTo(null);
      vi.advanceTimersByTime(1000);
      page().pointer.moveTo(trigger());
      expect(shown()).toBe(true);
    });

    it('leaves Escape alone when nothing is shown', () => {
      const down = page().keyboard.press('Escape');
      expect(down.defaultPrevented).toBe(false);
    });

    it('holds no document listener when nothing is shown', () => {
      const before = page().document.listenerCount();
      page().pointer.moveTo(trigger());
      expect(page().document.listenerCount()).toBeGreaterThan(before);
      page().pointer.moveTo(null);
      vi.advanceTimersByTime(1000);
      expect(page().document.listenerCount()).toBe(before);
    });
  });

  it('shows what the segment says about itself: the minutes and each lab, from the pipeline, with no link', () => {
    page().pointer.moveTo(trigger());
    const text = squash(popover().textContent);
    expect(text).toContain(String(segment().minutes));
    expect(segment().labRefs.length).toBeGreaterThan(0);
    for (const lab of segment().labRefs) expect(text, lab).toContain(lab);
    expect(within(popover(), 'a, [href]')).toHaveLength(0);
  });

  it('leaves no timer behind when the segment changes while it is closing', async () => {
    page().pointer.moveTo(trigger());
    page().pointer.moveTo(null);
    await page().go(otherSegment(entry.segment));
    vi.advanceTimersByTime(1000);
    expect(vi.getTimerCount()).toBe(0);
    await page().go(entry.segment);
    expect(hidden()).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// parameter-chart: the parameters of a dataset set from the keyboard, its outputs recomputed while the slide is shown

describe.each(cases('parameter-chart'))('parameter-chart: %s', (_id, entry) => {
  const page = usePage(entry, true);
  const model = datasetOf(entry);
  const defaults = Object.fromEntries(model.parameters.map((parameter) => [parameter.id, parameter.default]));
  const [lead, other] = model.parameters;
  const control = (): FakeElement => page().root(entry.id);
  const slider = (parameter: DatasetParameter): FakeElement => {
    const found = within(control(), '[role="slider"]').find((candidate) =>
      squash(ariaName(candidate, page().document)).includes(parameter.label),
    );
    if (found === undefined) throw new Error(`no slider is named for ${parameter.label}`);
    return found;
  };
  const stepper = (parameter: DatasetParameter, name: RegExp): FakeElement => {
    const target = slider(parameter).id;
    const found = within(control(), 'button').find(
      (candidate) => candidate.getAttribute('aria-controls') === target && name.test(squash(contentName(candidate, page().document))),
    );
    if (found === undefined) throw new Error(`no button named ${name} steps ${parameter.label}`);
    return found;
  };
  const increase = (parameter: DatasetParameter): FakeElement => stepper(parameter, /^increase/i);
  const decrease = (parameter: DatasetParameter): FakeElement => stepper(parameter, /^decrease/i);
  const valueOf = (parameter: DatasetParameter): number => Number(slider(parameter).getAttribute('aria-valuenow'));
  const current = (): Record<string, number> =>
    Object.fromEntries(model.parameters.map((parameter) => [parameter.id, valueOf(parameter)]));
  const described = (): string => ungrouped(byId(page(), entry.longDescriptionId ?? null).textContent);
  const live = (): string => ungrouped(page().liveRegion.textContent);
  const readouts = (): Array<{ label: string; value: string }> =>
    within(control(), 'dt').map((term) => ({ label: squash(term.textContent), value: ungrouped(term.nextElementSibling?.textContent ?? '') }));

  it('has a slider for every parameter of the dataset, named for it, at its default within its range, and in the tab order', () => {
    expect(within(control(), '[role="slider"]')).toHaveLength(model.parameters.length);
    for (const parameter of model.parameters) {
      const el = slider(parameter);
      expect(el.getAttribute('aria-valuemin'), parameter.id).toBe(String(parameter.min));
      expect(el.getAttribute('aria-valuemax'), parameter.id).toBe(String(parameter.max));
      expect(el.getAttribute('aria-valuenow'), parameter.id).toBe(String(parameter.default));
      expect(tabOrder(page().document), parameter.id).toContain(el);
    }
  });

  it('reads each value with its unit: aria-valuetext holds the number and the unit, and follows the value', () => {
    for (const parameter of model.parameters) {
      const text = ungrouped(slider(parameter).getAttribute('aria-valuetext') ?? '');
      expect(hasFigure(text, parameter.default), parameter.id).toBe(true);
      expect(text, parameter.id).toContain(parameter.unit);
    }
    slider(lead).focus();
    page().keyboard.press('ArrowRight');
    expect(hasFigure(ungrouped(slider(lead).getAttribute('aria-valuetext') ?? ''), lead.default + lead.step)).toBe(true);
  });

  it('moves a slider one step with ArrowRight and ArrowUp and back with ArrowLeft and ArrowDown, and keeps the page from scrolling', () => {
    for (const parameter of model.parameters) {
      expect(parameter.default - 2 * parameter.step, `${parameter.id} has room below its default`).toBeGreaterThanOrEqual(parameter.min);
      expect(parameter.default + 2 * parameter.step, `${parameter.id} has room above its default`).toBeLessThanOrEqual(parameter.max);
      slider(parameter).focus();
      for (const [key, direction] of [['ArrowRight', 1], ['ArrowUp', 1], ['ArrowLeft', -1], ['ArrowDown', -1]] as const) {
        const before = valueOf(parameter);
        const down = page().keyboard.press(key);
        expect(down.defaultPrevented, `${parameter.id} ${key}`).toBe(true);
        expect(valueOf(parameter), `${parameter.id} ${key}`).toBe(before + direction * parameter.step);
      }
      expect(valueOf(parameter), parameter.id).toBe(parameter.default);
    }
  });

  it('jumps to the ends of its range with End and Home', () => {
    for (const parameter of model.parameters) {
      slider(parameter).focus();
      expect(page().keyboard.press('End').defaultPrevented, `${parameter.id} End`).toBe(true);
      expect(valueOf(parameter), `${parameter.id} End`).toBe(parameter.max);
      expect(page().keyboard.press('Home').defaultPrevented, `${parameter.id} Home`).toBe(true);
      expect(valueOf(parameter), `${parameter.id} Home`).toBe(parameter.min);
    }
  });

  it('stops at both ends of its range: a press that changes nothing says nothing and writes nothing', () => {
    slider(lead).focus();
    page().keyboard.press('End');
    const atMax = stored(page(), entry);
    expect(announces(page(), () => page().keyboard.press('ArrowRight'))).toBe(false);
    expect(announces(page(), () => page().pointer.click(increase(lead)))).toBe(false);
    expect(valueOf(lead)).toBe(lead.max);
    expect(stored(page(), entry)).toBe(atMax);
    slider(lead).focus();
    page().keyboard.press('Home');
    const atMin = stored(page(), entry);
    expect(announces(page(), () => page().keyboard.press('ArrowLeft'))).toBe(false);
    expect(announces(page(), () => page().pointer.click(decrease(lead)))).toBe(false);
    expect(valueOf(lead)).toBe(lead.min);
    expect(stored(page(), entry)).toBe(atMin);
  });

  it('leaves keys with a modifier, and keys it has no use for, to the browser', () => {
    slider(lead).focus();
    for (const modifiers of [{ alt: true }, { ctrl: true }, { meta: true }, { shift: true }] as const) {
      for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
        expect(page().keyboard.press(key, modifiers).defaultPrevented, `${key} with ${Object.keys(modifiers)[0]}`).toBe(false);
      }
    }
    for (const key of ['a', 'Enter', 'PageUp']) expect(page().keyboard.press(key).defaultPrevented, key).toBe(false);
    expect(valueOf(lead)).toBe(lead.default);
  });

  it('steps with the buttons, by pointer and by keyboard, one step each, and keeps the focus on the button pressed', () => {
    for (const parameter of model.parameters) {
      const up = increase(parameter);
      const down = decrease(parameter);
      page().pointer.click(up);
      expect(valueOf(parameter), `${parameter.id} click`).toBe(parameter.default + parameter.step);
      expect(active(page()), `${parameter.id} focus after a click`).toBe(up);
      page().keyboard.press('Enter');
      expect(valueOf(parameter), `${parameter.id} Enter`).toBe(parameter.default + 2 * parameter.step);
      page().keyboard.press(' ');
      expect(valueOf(parameter), `${parameter.id} Space`).toBe(parameter.default + 3 * parameter.step);
      page().pointer.click(down);
      page().pointer.click(down);
      page().pointer.click(down);
      expect(valueOf(parameter), `${parameter.id} back`).toBe(parameter.default);
      expect(active(page()), `${parameter.id} focus after the last click`).toBe(down);
      expect(increase(parameter), `${parameter.id} is not rebuilt under the pointer`).toBe(up);
    }
  });

  it('recomputes every output of the dataset from the parameters, in the page, as they change', () => {
    const expectOutputs = (when: string): void => {
      const expected = outputsAt(model, current());
      const shown = Object.fromEntries(readouts().map((row) => [row.label, row.value]));
      for (const output of model.outputs) {
        const value = shown[output.label];
        expect(value, `${output.label} ${when}`).toBeDefined();
        expect(hasFigure(value, expected[output.id]), `${output.label} ${when}: "${value}" for ${expected[output.id]}`).toBe(true);
        expect(value, `${output.label} ${when}`).toContain(output.unit);
      }
    };
    expectOutputs('at the defaults');
    slider(lead).focus();
    page().keyboard.press('ArrowRight');
    expectOutputs('after a step of the first parameter');
    slider(other).focus();
    page().keyboard.press('End');
    expectOutputs('with the second parameter at its largest');
    page().pointer.click(decrease(lead));
    expectOutputs('after a click on a button');
    slider(lead).focus();
    page().keyboard.press('Home');
    slider(other).focus();
    page().keyboard.press('Home');
    expectOutputs('with both parameters at their smallest');
    expect(outputsAt(model, current())).toEqual(outputsAt(model, { [lead.id]: lead.min, [other.id]: other.min }));
  });

  it('announces the outputs that changed to the live region, with their new values and units', () => {
    slider(lead).focus();
    expect(announces(page(), () => page().keyboard.press('ArrowRight'))).toBe(true);
    settle();
    const expected = outputsAt(model, { ...defaults, [lead.id]: lead.default + lead.step });
    for (const output of model.outputs) {
      expect(live(), output.label).toContain(output.label);
      expect(hasFigure(live(), expected[output.id]), `${output.label} in "${live()}"`).toBe(true);
      expect(live(), output.label).toContain(output.unit);
    }
    expect(announces(page(), () => page().pointer.click(increase(other)))).toBe(true);
    expect(announces(page(), () => page().pointer.click(decrease(other)))).toBe(true);
  });

  it('says nothing when it is only mounted from state the store already holds', async () => {
    slider(lead).focus();
    page().keyboard.press('End');
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    settle();
    expect(squash(page().liveRegion.textContent)).toMatch(/^Segment \d+ of \d+/);
  });

  it('remembers the parameters across navigation, in the store, and shows them and their outputs again', async () => {
    slider(lead).focus();
    page().keyboard.press('ArrowRight');
    page().keyboard.press('ArrowRight');
    slider(other).focus();
    page().keyboard.press('End');
    const expected = { ...defaults, [lead.id]: lead.default + 2 * lead.step, [other.id]: other.max };
    expect(stored(page(), entry)).toEqual(expected);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expect(current()).toEqual(expected);
    const outputs = outputsAt(model, expected);
    for (const output of model.outputs) {
      const row = readouts().find((candidate) => candidate.label === output.label);
      expect(hasFigure(row?.value ?? '', outputs[output.id]), output.label).toBe(true);
    }
    expect(page().spa.store.get().segments[otherSegment(entry.segment)].parameters[entry.id]).toBeUndefined();
  });

  it.each<[string, (ids: readonly string[]) => unknown]>([
    ['a string', () => 'banana'],
    ['null', () => null],
    ['an array', () => [1, 2]],
    ['an empty object', () => ({})],
    ['values that are no numbers', (ids) => ({ [ids[0]]: 'lots', [ids[1]]: null })],
    ['values that are not finite', (ids) => ({ [ids[0]]: NaN, [ids[1]]: Infinity })],
    ['values outside the range', (ids) => ({ [ids[0]]: 1e9, [ids[1]]: -5 })],
    ['values between two steps', (ids) => ({ [ids[0]]: 8400, [ids[1]]: 1260 })],
    ['the first parameter alone', (ids) => ({ [ids[0]]: 20000 })],
  ])('shows an allowed value for every parameter when the stored state is %s', async (_name, garbage) => {
    const stale = garbage(model.parameters.map((parameter) => parameter.id));
    store(page(), entry, stale);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    for (const parameter of model.parameters) {
      expect(valueOf(parameter), parameter.id).toBe(allowed(parameter, isRecord(stale) ? stale[parameter.id] : undefined));
    }
  });

  it('describes the model in words, in the element the entry names: how it is sourced, each parameter and its range, each output and its formula, and the baseline', () => {
    const before = described();
    expect(before).toMatch(new RegExp(model.provenance.kind, 'i'));
    if (model.provenance.note !== undefined) expect(flat(before)).toContain(flat(model.provenance.note));
    for (const parameter of model.parameters) {
      expect(before, parameter.id).toContain(parameter.label);
      expect(hasFigure(before, parameter.min), `${parameter.id} minimum`).toBe(true);
      expect(hasFigure(before, parameter.max), `${parameter.id} maximum`).toBe(true);
      expect(hasFigure(before, parameter.default), `${parameter.id} value`).toBe(true);
    }
    for (const output of model.outputs) {
      expect(before, output.label).toContain(output.label);
      for (const term of output.terms) expect(hasFigure(before, term.coefficient), `${output.label} coefficient ${term.coefficient}`).toBe(true);
    }
    expect(before).toMatch(/baseline/i);
    slider(lead).focus();
    page().keyboard.press('ArrowRight');
    page().keyboard.press('ArrowRight');
    const after = described();
    expect(after).not.toBe(before);
    const baseline = outputsAt(model, defaults);
    const now = outputsAt(model, current());
    for (const output of model.outputs) {
      expect(hasFigure(after, now[output.id]), `${output.label} now`).toBe(true);
      expect(hasFigure(after, baseline[output.id]), `${output.label} at the baseline`).toBe(true);
    }
    expect(hasFigure(after, lead.default + 2 * lead.step), 'the new value of the first parameter').toBe(true);
  });

  it('sits in the slide body before the first break, leaving <main> as heading plus body, and keeps all the slide text', () => {
    const body = control().parentElement as FakeElement;
    expect(page().main.children.map((child) => child.localName)).toEqual(['h1', 'div']);
    expect(page().main.children[1]).toBe(body);
    expect(body.children.indexOf(control())).toBeLessThan(body.children.findIndex((el) => el.localName === 'hr'));
    const rest = body.children.filter((el) => el !== control()).map((el) => el.textContent).join(' ');
    expect(flat(rest)).toBe(flat(slideOf(entry.segment).textContent));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// node-diagram: nodes read off the slide, one of them selected, its details shown

describe.each(cases('node-diagram'))('node-diagram: %s', (_id, entry) => {
  const page = usePage(entry, true);
  const control = (): FakeElement => page().root(entry.id);
  const nodes = (): FakeElement[] => within(control(), 'button');
  const pressed = (): number[] => nodes().flatMap((node, index) => (node.getAttribute('aria-pressed') === 'true' ? [index] : []));
  const details = (): FakeElement => byId(page(), nodes()[0].getAttribute('aria-controls'));
  const nameOf = (node: FakeElement): string => squash(contentName(node, page().document));
  /** The list of the slide whose lead-ins the nodes are named by: the list the diagram was read off. */
  const source = (): FakeElement => {
    const names = nodes().map(nameOf);
    const found = leadInLists(slideOf(entry.segment)).find((list) => {
      const leadIns = list.children.map((item) => splitItem(item).leadIn);
      return leadIns.length === names.length && leadIns.every((leadIn, index) => leadIn === names[index]);
    });
    if (found === undefined) throw new Error(`no list of the slide has the lead-ins ${JSON.stringify(names)}`);
    return found;
  };
  /** What an item says after its lead-in, without the arrow that joins the two. */
  const restOf = (index: number): string => flat(splitItem(source().children[index]).rest).replace(/^→/, '');
  const roving = (): FakeElement[] => nodes().filter((node) => node.getAttribute('tabindex') === '0');

  it('reads its nodes off the slide: one node for each item of a list, named by the bold lead-in of the item', () => {
    expect(nodes().length).toBeGreaterThan(1);
    expect(source().children).toHaveLength(nodes().length);
    const tabNames = within(page().main, '[role="tab"]').map(nameOf);
    expect(nodes().map(nameOf)).not.toEqual(tabNames);
  });

  it('starts with the first node selected and its details shown, and only that node in the page tab order', () => {
    expect(pressed()).toEqual([0]);
    expect(nodes().filter((node) => tabOrder(page().document).includes(node))).toEqual([nodes()[0]]);
    expect(details().hidden).toBe(false);
    expect(flat(details().textContent)).toContain(restOf(0));
  });

  it('shows the details of the node selected in one region shared by all of them, labelled by that node', () => {
    const region = details();
    nodes().forEach((node, index) => {
      page().pointer.click(node);
      expect(pressed(), `node ${index}`).toEqual([index]);
      expect(details(), `node ${index}`).toBe(region);
      expect(region.hidden, `node ${index}`).toBe(false);
      expect(flat(region.textContent), `node ${index}`).toContain(restOf(index));
      expect(region.getAttribute('aria-labelledby'), `node ${index}`).toBe(node.id);
      const next = (index + 1) % nodes().length;
      expect(flat(region.textContent), `node ${index} without the details of node ${next}`).not.toContain(restOf(next));
    });
  });

  it('moves focus with all four arrows, wrapping at both ends, without selecting what it passes, and keeps the page from scrolling', () => {
    const list = nodes();
    const last = list.length - 1;
    list[0].focus();
    const moves: Array<[string, number]> = [
      ['ArrowRight', 1],
      ['ArrowDown', 2],
      ['ArrowLeft', 1],
      ['ArrowUp', 0],
      ['ArrowLeft', last],
      ['ArrowRight', 0],
      ['ArrowUp', last],
      ['ArrowDown', 0],
    ];
    for (const [key, index] of moves) {
      const down = page().keyboard.press(key);
      expect(down.defaultPrevented, key).toBe(true);
      expect(active(page()), key).toBe(list[index]);
      expect(pressed(), key).toEqual([0]);
      expect(roving(), `${key}: the node in the tab order is the one with focus`).toEqual([list[index]]);
    }
  });

  it('selects the focused node with Enter and with Space, and the node clicked, and keeps a selected node selected', () => {
    const list = nodes();
    const last = list.length - 1;
    list[2].focus();
    page().keyboard.press('Enter');
    expect(pressed()).toEqual([2]);
    list[last].focus();
    page().keyboard.press(' ');
    expect(pressed()).toEqual([last]);
    page().pointer.click(list[1]);
    expect(pressed()).toEqual([1]);
    page().pointer.click(list[1]);
    expect(pressed()).toEqual([1]);
    expect(active(page())).toBe(list[1]);
    expect(roving()).toEqual([list[1]]);
    expect(nodes()).toEqual(list);
  });

  it('ignores the arrow keys with a modifier, which belong to the browser', () => {
    nodes()[0].focus();
    for (const modifiers of [{ alt: true }, { ctrl: true }, { meta: true }, { shift: true }] as const) {
      for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']) {
        expect(page().keyboard.press(key, modifiers).defaultPrevented, `${key} with ${Object.keys(modifiers)[0]}`).toBe(false);
      }
    }
    expect(active(page())).toBe(nodes()[0]);
  });

  it('remembers the selected node across navigation, in the store, and shows its details again', async () => {
    page().pointer.click(nodes()[3]);
    expect(stored(page(), entry)).toBe(3);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expect(pressed()).toEqual([3]);
    expect(flat(details().textContent)).toContain(restOf(3));
    expect(roving()).toEqual([nodes()[3]]);
    expect(page().spa.store.get().segments[otherSegment(entry.segment)].parameters[entry.id]).toBeUndefined();
  });

  it.each<[string, unknown]>([
    ['a string', 'banana'],
    ['a negative index', -1],
    ['an index past the end', 99],
    ['a fraction', 1.5],
    ['null', null],
    ['an object', {}],
  ])('selects the first node when the stored state is %s', async (_name, garbage) => {
    store(page(), entry, garbage);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expect(pressed()).toEqual([0]);
  });

  it('says nothing to the live region when a node is selected, or when it is mounted from state', async () => {
    // The first segment is not announced when the page opens on it, so the region holds something to tell a message from only after a visit.
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expect(announces(page(), () => page().pointer.click(nodes()[1]))).toBe(false);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    settle();
    expect(squash(page().liveRegion.textContent)).toMatch(/^Segment \d+ of \d+/);
  });

  it('marks the selected node in more than color, and in a color at least 3:1 against what is next to it', () => {
    const surface = declared(control())['background-color'];
    expect(surface, 'the diagram declares the surface its nodes sit on, so contrast does not depend on the page theme').toBeDefined();
    const list = nodes();
    list.forEach((chosen, index) => {
      page().pointer.click(chosen);
      for (const [other, node] of list.entries()) {
        const style = declared(node);
        if (other === index) {
          expect(contrast(colorIn(style['background-color']), colorIn(surface)), `selected node ${other} against the surface`).toBeGreaterThanOrEqual(3);
          expect(contrast(colorIn(style['background-color']), colorIn(declared(list[(index + 1) % list.length])['background-color'])), `selected node ${other} against its neighbour`).toBeGreaterThanOrEqual(3);
        } else {
          expect(contrast(colorIn(style.border), colorIn(surface)), `the border of node ${other}`).toBeGreaterThanOrEqual(3);
        }
        expect(contrast(colorIn(style.color), colorIn(style['background-color'])), `the text of node ${other}`).toBeGreaterThanOrEqual(4.5);
      }
      const selected = declared(chosen);
      const rest = declared(list[(index + 1) % list.length]);
      expect(selected.border, 'a thicker or different border').not.toBe(rest.border);
      expect(selected['font-weight'], 'a different weight').not.toBe(rest['font-weight']);
    });
  });

  it('keeps the list it was read off, whole, in the element the entry names, right after the diagram', () => {
    const list = byId(page(), entry.longDescriptionId ?? null);
    expect(list.localName).toBe('ul');
    expect(control().nextElementSibling).toBe(list);
    expect(flat(list.textContent)).toBe(flat(source().textContent));
    expect(list.querySelectorAll('li')).toHaveLength(nodes().length);
  });

  it('sits in the slide body, leaving <main> as heading plus body', () => {
    expect(page().main.children.map((child) => child.localName)).toEqual(['h1', 'div']);
    expect(control().parentElement).toBe(page().main.children[1]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// carousel: APG carousel without auto-rotation, one slide shown, previous and next that keep focus

describe.each(cases('carousel'))('carousel: %s', (_id, entry) => {
  const page = usePage(entry, true);
  const control = (): FakeElement => page().root(entry.id);
  const slides = (): FakeElement[] => within(control(), '[aria-roledescription="slide"]');
  const wrapper = (): FakeElement => {
    const parent = slides()[0].parentElement;
    if (parent === null) throw new Error('the slides have no parent');
    return parent;
  };
  const shown = (): number[] => slides().flatMap((slide, index) => (slide.hidden ? [] : [index]));
  const button = (name: RegExp): FakeElement => {
    const found = within(control(), 'button').find((candidate) => name.test(nameOf(candidate)));
    if (found === undefined) throw new Error(`no button named ${name}`);
    return found;
  };
  const nameOf = (node: FakeElement): string => squash(contentName(node, page().document));
  const previous = (): FakeElement => button(/^previous/i);
  const next = (): FakeElement => button(/^next/i);
  const count = (): number => slides().length;
  const live = (): string => squash(page().liveRegion.textContent);

  it('is a carousel in a group or region, named for the entry', () => {
    const root = control();
    expect(['region', 'group']).toContain(root.getAttribute('role'));
    expect(root.getAttribute('aria-roledescription')).toBe('carousel');
    expect(squash(ariaName(root, page().document))).toBe(entry.label);
  });

  it('has a slide for each item of the list it replaces, a named group of the slide role, holding all the text of the item', () => {
    const items = leadInLists(slideOf(entry.segment))[0].children;
    expect(count()).toBe(items.length);
    expect(count()).toBeGreaterThan(1);
    slides().forEach((slide, index) => {
      expect(slide.getAttribute('role'), `slide ${index}`).toBe('group');
      expect(slide.getAttribute('aria-roledescription'), `slide ${index}`).toBe('slide');
      expect(squash(ariaName(slide, page().document)), `slide ${index}`).toBe(splitItem(items[index]).leadIn.replace(/[.:]+$/, ''));
      expect(flat(slide.textContent), `slide ${index}`).toBe(flat(items[index].textContent));
    });
  });

  it('shows one slide at a time, the first to begin with, in a wrapper that is a polite live region, and rotates by itself never', () => {
    expect(shown()).toEqual([0]);
    expect(wrapper().getAttribute('aria-live')).toBe('polite');
    expect(slides().every((slide) => slide.parentElement === wrapper())).toBe(true);
    vi.advanceTimersByTime(10 * 60_000);
    expect(shown()).toEqual([0]);
    expect(vi.getTimerCount()).toBe(0);
    expect(within(control(), '[aria-live]').filter((el) => el !== wrapper())).toHaveLength(0);
  });

  it('moves to the next slide and the previous one with its buttons, wrapping at both ends', () => {
    page().pointer.click(next());
    expect(shown()).toEqual([1]);
    page().pointer.click(previous());
    expect(shown()).toEqual([0]);
    page().pointer.click(previous());
    expect(shown()).toEqual([count() - 1]);
    page().pointer.click(next());
    expect(shown()).toEqual([0]);
  });

  it('keeps the focus on the button pressed, by pointer and by keyboard, and does not rebuild the button', () => {
    const forward = next();
    const back = previous();
    page().pointer.click(forward);
    expect(shown()).toEqual([1 % count()]);
    expect(active(page())).toBe(forward);
    page().keyboard.press('Enter');
    expect(shown()).toEqual([2 % count()]);
    expect(active(page())).toBe(forward);
    page().keyboard.press(' ');
    expect(shown()).toEqual([3 % count()]);
    expect(active(page())).toBe(forward);
    back.focus();
    page().keyboard.press('Enter');
    expect(shown()).toEqual([2 % count()]);
    expect(active(page())).toBe(back);
    page().pointer.click(back);
    expect(active(page())).toBe(back);
    expect(next()).toBe(forward);
    expect(previous()).toBe(back);
  });

  it('puts only the two buttons in the page tab order, the slide that is hidden having nothing to reach', () => {
    const order = tabOrder(page().document).filter((el) => control().contains(el));
    expect(order).toEqual([previous(), next()].sort((a, b) => control().children.indexOf(a) - control().children.indexOf(b)).length === 2 ? order : []);
    expect(order).toContain(previous());
    expect(order).toContain(next());
    for (const slide of slides().filter((candidate) => candidate.hidden)) expect(order.some((el) => slide.contains(el))).toBe(false);
  });

  it('says which slide it shows, as "k of N", outside the wrapper', () => {
    for (let index = 0; index < count(); index += 1) {
      const place = new RegExp(`\\b${index + 1} of ${count()}\\b`);
      expect(squash(control().textContent), `slide ${index + 1}`).toMatch(place);
      expect(squash(wrapper().textContent), `slide ${index + 1}`).not.toMatch(place);
      page().pointer.click(next());
    }
  });

  it('remembers the slide across navigation, in the store', async () => {
    page().pointer.click(next());
    page().pointer.click(next());
    expect(stored(page(), entry)).toBe(2);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expect(shown()).toEqual([2]);
    expect(page().spa.store.get().segments[otherSegment(entry.segment)].parameters[entry.id]).toBeUndefined();
  });

  it.each<[string, unknown]>([
    ['a string', 'banana'],
    ['a negative index', -1],
    ['an index past the end', 99],
    ['a fraction', 1.5],
    ['null', null],
    ['an object', {}],
  ])('shows the first slide when the stored state is %s', async (_name, garbage) => {
    store(page(), entry, garbage);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expect(shown()).toEqual([0]);
  });

  it('says nothing to the live region of the shell: the slide wrapper tells a reader what changed', async () => {
    expect(announces(page(), () => page().pointer.click(next()))).toBe(false);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    settle();
    expect(live()).toMatch(/^Segment \d+ of \d+/);
  });

  it('keeps the rest of the slide as it was: the list is replaced by the carousel and nothing else is touched', () => {
    const raw = slideOf(entry.segment);
    leadInLists(raw)[0].remove();
    const body = control().parentElement as FakeElement;
    const outside = body.children.filter((el) => el !== control()).map((el) => el.textContent).join(' ');
    expect(flat(outside)).toBe(flat(raw.textContent));
    expect(page().main.children.map((child) => child.localName)).toEqual(['h1', 'div']);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// segment-timer: pacing against the minutes of the segment, started, paused, stopped and reset by hand

describe.each(cases('segment-timer'))('segment-timer: %s', (_id, entry) => {
  const page = usePage(entry, true);
  const total = (): number => minutesOf(entry.segment) * 60_000;
  const control = (): FakeElement => page().root(entry.id);
  const button = (name: RegExp): FakeElement => {
    const found = within(control(), 'button').find((candidate) => name.test(squash(contentName(candidate, page().document))));
    if (found === undefined) throw new Error(`no timer button named ${name}`);
    return found;
  };
  const start = (): FakeElement => button(/^start/i);
  const pause = (): FakeElement => button(/^pause/i);
  const stop = (): FakeElement => button(/^stop/i);
  const reset = (): FakeElement => button(/^reset/i);
  const readout = (): FakeElement => within(control(), '[role="timer"]')[0];
  const shown = (): string => squash(readout().textContent);
  const caption = (): string => squash(control().textContent);
  const live = (): string => squash(page().liveRegion.textContent);
  /** The time left as a clock reads it: whole minutes, zero-padded seconds, and a second begun counted as left. */
  const clock = (leftMs: number): string => {
    const seconds = Math.ceil(leftMs / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };
  /** The time left as it is said: minutes and seconds in words. */
  const words = (leftMs: number): string => {
    const seconds = Math.ceil(leftMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return [minutes > 0 ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : '', rest > 0 ? `${rest} ${rest === 1 ? 'second' : 'seconds'}` : '']
      .filter((part) => part !== '')
      .join(' ');
  };
  let began = 0;
  const run = (): void => {
    began = Date.now();
    page().pointer.click(start());
  };
  /** Move the clock on to this many seconds after the last run began, firing everything that falls due on the way. */
  const at = (seconds: number): void => void vi.advanceTimersByTime(began + seconds * 1000 - Date.now());
  /** Let the announcer write what it was given. */
  const flush = (): void => void vi.advanceTimersByTime(50);
  const secondsLeft = (): number => {
    const [minutes, seconds] = shown().split(':').map(Number);
    return minutes * 60 + seconds;
  };

  it('starts ready, at the whole time of the segment, with nothing counting', () => {
    expect(shown()).toBe(`${minutesOf(entry.segment)}:00`);
    expect(caption()).toMatch(/ready/i);
    settle();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(shown()).toBe(clock(total()));
  });

  it('is a named group of four buttons and a time, and the time carries no live region of its own', () => {
    expect(squash(ariaName(control(), page().document))).toBe(entry.label);
    for (const name of [/^start/i, /^pause/i, /^stop/i, /^reset/i]) expect(button(name)).toBeDefined();
    expect(squash(ariaName(readout(), page().document))).not.toBe('');
    expect(['polite', 'assertive']).not.toContain(readout().getAttribute('aria-live'));
    expect(within(control(), '[aria-live]')).toHaveLength(0);
  });

  it('sits right after the heading of the slide, leaving <main> as heading plus body', () => {
    const body = control().parentElement as FakeElement;
    expect(page().main.children.map((child) => child.localName)).toEqual(['h1', 'div']);
    expect(page().main.children[1]).toBe(body);
    expect(body.children[0].localName).toBe('h1');
    expect(body.children[1]).toBe(control());
  });

  it('counts down once a second from Start, and only then', () => {
    run();
    at(1);
    expect(shown()).toBe(clock(total() - 1000));
    expect(caption()).toMatch(/running/i);
    at(61);
    expect(shown()).toBe(clock(total() - 61_000));
    expect(vi.getTimerCount()).toBe(1);
  });

  it('pauses on Pause, keeps the time, and goes on from the same time on Start', () => {
    run();
    at(10);
    page().pointer.click(pause());
    settle();
    expect(shown()).toBe(clock(total() - 10_000));
    expect(caption()).toMatch(/paused/i);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(shown()).toBe(clock(total() - 10_000));
    page().pointer.click(start());
    vi.advanceTimersByTime(5000);
    expect(shown()).toBe(clock(total() - 15_000));
    expect(caption()).toMatch(/running/i);
  });

  it('goes back to ready and the whole time on Stop, and counts nothing', () => {
    run();
    at(30);
    page().pointer.click(stop());
    settle();
    expect(shown()).toBe(clock(total()));
    expect(caption()).toMatch(/ready/i);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(shown()).toBe(clock(total()));
  });

  it('starts the count again on Reset, running if it was running and paused if it was paused', () => {
    run();
    at(30);
    page().pointer.click(reset());
    expect(shown()).toBe(clock(total()));
    expect(caption()).toMatch(/running/i);
    vi.advanceTimersByTime(3000);
    expect(shown()).toBe(clock(total() - 3000));
    page().pointer.click(pause());
    vi.advanceTimersByTime(7000);
    page().pointer.click(reset());
    expect(shown()).toBe(clock(total()));
    expect(caption()).toMatch(/paused/i);
    settle();
    expect(vi.getTimerCount()).toBe(0);
    page().pointer.click(start());
    vi.advanceTimersByTime(2000);
    expect(shown()).toBe(clock(total() - 2000));
  });

  it('ends at zero: shows it, says so once, stops counting, and leaves the page where it was', () => {
    const where = page().spa.store.get().currentId;
    run();
    at(total() / 1000 - 1);
    expect(shown()).toBe('0:01');
    at(total() / 1000);
    expect(shown()).toBe('0:00');
    expect(caption()).toMatch(/time is up/i);
    expect(page().liveRegion.textContent, 'announced at this very tick, written a moment later').toBe('');
    flush();
    expect(live()).toMatch(/time is up/i);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10 * 60_000);
    expect(shown()).toBe('0:00');
    expect(live()).toMatch(/time is up/i);
    expect(page().spa.store.get().currentId).toBe(where);
    expect(caption()).toMatch(/time is up/i);
  });

  it('starts again from the whole time when Start is pressed after it ended', () => {
    run();
    at(total() / 1000);
    expect(caption()).toMatch(/time is up/i);
    page().pointer.click(start());
    expect(shown()).toBe(clock(total()));
    expect(caption()).toMatch(/running/i);
    vi.advanceTimersByTime(4000);
    expect(shown()).toBe(clock(total() - 4000));
  });

  it('announces each change of state with the time left, in words', () => {
    run();
    flush();
    expect(live()).toMatch(/start/i);
    expect(live()).toContain(words(total()));
    at(10);
    page().pointer.click(pause());
    flush();
    expect(live()).toMatch(/paus/i);
    expect(live()).toContain(words(total() - 10_000));
    page().pointer.click(start());
    flush();
    expect(live()).toContain(words(total() - 10_000));
    page().pointer.click(reset());
    flush();
    expect(live()).toMatch(/reset/i);
    expect(live()).toContain(words(total()));
    page().pointer.click(stop());
    flush();
    expect(live()).toMatch(/stop/i);
    expect(live()).toContain(words(total()));
  });

  it('says it is five minutes and one minute from the end, once each, and nothing in between', () => {
    expect(total(), 'the segment is longer than five minutes').toBeGreaterThan(5 * 60_000);
    const seconds = total() / 1000;
    run();
    at(seconds - 300 - 2);
    flush();
    expect(page().liveRegion.textContent, 'the start is the last thing said').not.toBe('');
    at(seconds - 300 - 1);
    expect(page().liveRegion.textContent, 'five minutes and a second left').not.toBe('');
    at(seconds - 300);
    expect(page().liveRegion.textContent, 'five minutes left: said at this tick').toBe('');
    flush();
    expect(live()).toContain(words(300_000));
    at(seconds - 299);
    expect(page().liveRegion.textContent, 'not said again').not.toBe('');
    at(seconds - 60 - 1);
    expect(page().liveRegion.textContent, 'a minute and a second left').not.toBe('');
    at(seconds - 60);
    expect(page().liveRegion.textContent, 'a minute left: said at this tick').toBe('');
    flush();
    expect(live()).toContain(words(60_000));
    at(seconds - 59);
    expect(page().liveRegion.textContent, 'not said again').not.toBe('');
  });

  it('does not say a mark that has already passed when it is started again', () => {
    const seconds = total() / 1000;
    run();
    at(seconds - 240);
    page().pointer.click(pause());
    flush();
    vi.advanceTimersByTime(5000);
    page().pointer.click(start());
    flush();
    expect(live()).toContain(words(240_000));
    expect(live()).not.toContain(words(300_000));
    vi.advanceTimersByTime(1000);
    expect(page().liveRegion.textContent, 'no five-minute mark after the resume').not.toBe('');
    vi.advanceTimersByTime(1000);
    expect(page().liveRegion.textContent).not.toBe('');
  });

  it('says nothing for a control that has nothing to do', async () => {
    // The first segment is not announced when the page opens on it, so the region holds something to tell a message from only after a visit.
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expect(announces(page(), () => page().pointer.click(pause()))).toBe(false);
    expect(announces(page(), () => page().pointer.click(stop()))).toBe(false);
    expect(announces(page(), () => page().pointer.click(reset()))).toBe(false);
    expect(caption()).toMatch(/ready/i);
    run();
    flush();
    expect(announces(page(), () => page().pointer.click(start()))).toBe(false);
    expect(caption()).toMatch(/running/i);
  });

  it('is operated from the keyboard: Tab reaches the four buttons in order, Enter and Space press them, Escape pauses', () => {
    const order = tabOrder(page().document).filter((el) => control().contains(el));
    expect(order).toEqual([start(), pause(), stop(), reset()]);
    start().focus();
    page().keyboard.press('Enter');
    expect(caption()).toMatch(/running/i);
    pause().focus();
    page().keyboard.press(' ');
    expect(caption()).toMatch(/paused/i);
    start().focus();
    page().keyboard.press(' ');
    expect(caption()).toMatch(/running/i);
    for (const modifiers of [{ alt: true }, { ctrl: true }, { meta: true }, { shift: true }] as const) {
      expect(page().keyboard.press('Escape', modifiers).defaultPrevented, `Escape with ${Object.keys(modifiers)[0]}`).toBe(false);
    }
    expect(caption()).toMatch(/running/i);
    expect(page().keyboard.press('Escape').defaultPrevented).toBe(true);
    expect(caption()).toMatch(/paused/i);
    expect(page().keyboard.press('Escape').defaultPrevented, 'nothing to pause').toBe(false);
    stop().focus();
    page().keyboard.press('Enter');
    expect(caption()).toMatch(/ready/i);
    expect(page().keyboard.press('Escape').defaultPrevented, 'nothing to pause').toBe(false);
  });

  it('never moves to another segment, and takes nothing out of the keyboard that is not its own', () => {
    run();
    start().focus();
    const down = page().keyboard.press('ArrowRight');
    expect(down.defaultPrevented).toBe(false);
    at(total() / 1000);
    expect(page().spa.store.get().currentId).toBe(entry.segment);
  });

  it('keeps its state in the store as small plain data, written when the state changes and not every second', () => {
    run();
    const saved = stored(page(), entry);
    expect(isRecord(saved)).toBe(true);
    expect(Object.keys(saved as Record<string, unknown>).sort()).toEqual(['elapsedMs', 'startedAt', 'state']);
    expect(JSON.parse(JSON.stringify(saved))).toEqual(saved);
    vi.advanceTimersByTime(30_000);
    expect(stored(page(), entry)).toBe(saved);
    page().pointer.click(pause());
    expect(stored(page(), entry)).not.toBe(saved);
    expect(stored(page(), entry)).toMatchObject({ state: 'paused', startedAt: null });
  });

  it('goes on counting while the segment is away, and shows the time that went by when it comes back', async () => {
    run();
    at(10);
    await page().go(otherSegment(entry.segment));
    settle();
    expect(vi.getTimerCount(), 'nothing counts while the segment is not on the page').toBe(0);
    vi.advanceTimersByTime(20_000);
    await page().go(entry.segment);
    expect(shown()).toBe(clock(total() - (Date.now() - began)));
    expect(caption()).toMatch(/running/i);
    expect(vi.getTimerCount() === 1 || vi.getTimerCount() === 2, 'counting again, with at most the announcer waiting').toBe(true);
    const before = secondsLeft();
    vi.advanceTimersByTime(5000);
    expect(secondsLeft()).toBe(before - 5);
  });

  it('keeps a paused timer paused, at the time it had, while the segment is away', async () => {
    run();
    at(5);
    page().pointer.click(pause());
    await page().go(otherSegment(entry.segment));
    vi.advanceTimersByTime(10 * 60_000);
    await page().go(entry.segment);
    settle();
    expect(shown()).toBe(clock(total() - 5000));
    expect(caption()).toMatch(/paused/i);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('has ended when the time ran out while the segment was away, and says nothing about it on the way back', async () => {
    run();
    await page().go(otherSegment(entry.segment));
    vi.advanceTimersByTime(total() + 10_000);
    await page().go(entry.segment);
    settle();
    expect(shown()).toBe('0:00');
    expect(caption()).toMatch(/time is up/i);
    expect(vi.getTimerCount()).toBe(0);
    expect(live()).toMatch(/^Segment \d+ of \d+/);
  });

  it.each<[string, unknown]>([
    ['a string', 'banana'],
    ['null', null],
    ['a number', 42],
    ['an array', []],
    ['an empty object', {}],
    ['a state it does not know', { state: 'exploding', elapsedMs: 0, startedAt: null }],
    ['no elapsed time', { state: 'paused' }],
    ['a negative elapsed time', { state: 'paused', elapsedMs: -1000, startedAt: null }],
    ['an elapsed time that is no number', { state: 'paused', elapsedMs: 'soon', startedAt: null }],
    ['an elapsed time that is not finite', { state: 'paused', elapsedMs: Infinity, startedAt: null }],
    ['a running state with no start', { state: 'running', elapsedMs: 0, startedAt: null }],
    ['a running state with a start that is no number', { state: 'running', elapsedMs: 0, startedAt: 'now' }],
  ])('starts ready at the whole time when the stored state is %s', async (_name, garbage) => {
    store(page(), entry, garbage);
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    settle();
    expect(shown()).toBe(clock(total()));
    expect(caption()).toMatch(/ready/i);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('has ended when the stored time is past the end, whether it was paused or running', async () => {
    store(page(), entry, { state: 'paused', elapsedMs: total() + 5000, startedAt: null });
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    settle();
    expect(shown()).toBe('0:00');
    expect(caption()).toMatch(/time is up/i);
    store(page(), entry, { state: 'running', elapsedMs: 0, startedAt: Date.now() - total() - 5000 });
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    settle();
    expect(shown()).toBe('0:00');
    expect(caption()).toMatch(/time is up/i);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('counts from now when the stored start lies in the future, as it does when the clock was set back', async () => {
    store(page(), entry, { state: 'running', elapsedMs: 0, startedAt: Date.now() + 3_600_000 });
    await page().go(otherSegment(entry.segment));
    await page().go(entry.segment);
    expect(shown()).toBe(clock(total()));
    expect(caption()).toMatch(/running/i);
    vi.advanceTimersByTime(5000);
    expect(shown()).toBe(clock(total() - 5000));
  });

  it('goes on counting when the clock is set back while it runs, and never shows more than the whole time', () => {
    run();
    at(10);
    expect(shown()).toBe(clock(total() - 10_000));
    vi.setSystemTime(Date.now() - 3_600_000);
    vi.advanceTimersByTime(1000);
    expect(secondsLeft()).toBeLessThanOrEqual(total() / 1000);
    expect(shown()).toMatch(/^\d+:\d{2}$/);
    vi.advanceTimersByTime(5000);
    const left = secondsLeft();
    expect(left, 'it did not stop for the hour the clock went back').toBeLessThanOrEqual(total() / 1000 - 14);
    expect(left, 'it did not jump forward').toBeGreaterThanOrEqual(total() / 1000 - 16);
  });

  it('leaves no timer behind when the segment changes while it is running', async () => {
    run();
    at(3);
    await page().go(otherSegment(entry.segment));
    settle();
    expect(vi.getTimerCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// every interaction

/** Press the button of an interaction whose name opens with this. */
function clickNamed(page: Booted, entry: InventoryEntry, name: RegExp): void {
  const found = within(page.root(entry.id), 'button').find((button) => name.test(squash(contentName(button, page.document))));
  if (found === undefined) throw new Error(`behaviour: ${entry.id} has no button named ${name}`);
  found.click();
}

const PRIMARY_ACTIONS: Record<string, (page: Booted, entry: InventoryEntry) => void> = {
  tabs: (page, entry) => {
    within(page.root(entry.id), '[role="tab"]')[0].focus();
    page.keyboard.press('ArrowRight');
  },
  accordion: (page, entry) => {
    within(page.root(entry.id), 'button[aria-controls]')[1].click();
  },
  dialog: (page, entry) => {
    within(page.root(entry.id), 'button[aria-haspopup]')[0].click();
  },
  'staged-reveal': (page, entry) => {
    within(page.root(entry.id), 'button')[0].focus();
    page.keyboard.press('ArrowRight');
  },
  'disclosure-popover': (page, entry) => {
    page.pointer.moveTo(within(page.root(entry.id), 'button[aria-expanded]')[0]);
  },
  'parameter-chart': (page, entry) => {
    clickNamed(page, entry, /^increase/i);
  },
  'node-diagram': (page, entry) => {
    within(page.root(entry.id), 'button')[1].click();
  },
  carousel: (page, entry) => {
    clickNamed(page, entry, /^next/i);
  },
  'segment-timer': (page, entry) => {
    clickNamed(page, entry, /^start/i);
  },
};

describe.each(inventory.map((entry): [string, InventoryEntry] => [entry.id, entry]))('every interaction: %s', (_id, entry) => {
  const page = usePage(entry, true);

  it('adds no link to the page, which the shell would route as a segment link', () => {
    expect(page().main.querySelectorAll('a')).toHaveLength(slideOf(entry.segment).querySelectorAll('a').length);
  });

  it('is mounted once per visit and leaves no listener, inert marker or timer behind when the segment changes', async () => {
    const p = page();
    settle();
    const listeners = p.document.listenerCount();
    for (let visit = 0; visit < 3; visit += 1) {
      PRIMARY_ACTIONS[entry.pattern](p, entry);
      await p.go(otherSegment(entry.segment));
      settle();
      expect(p.document.listenerCount(), `after leaving, visit ${visit + 1}`).toBe(listeners);
      expect(p.document.querySelectorAll('[inert]'), 'inert').toHaveLength(0);
      expect(vi.getTimerCount(), 'timers').toBe(0);
      await p.go(entry.segment);
      settle();
      expect(p.document.querySelectorAll(`#${entry.id}`), 'roots').toHaveLength(1);
      expect(p.document.listenerCount(), `after returning, visit ${visit + 1}`).toBe(listeners);
    }
  });

  it('has a primary action in this table, so the live-region rule below covers its pattern', () => {
    expect(PRIMARY_ACTIONS).toHaveProperty([entry.pattern]);
  });

  it(`writes to the live region exactly when its statusRegion says so (statusRegion: ${entry.statusRegion})`, () => {
    const p = page();
    settle();
    const before = p.liveRegion.textContent;
    PRIMARY_ACTIONS[entry.pattern](p, entry);
    settle();
    if (entry.statusRegion) expect(p.liveRegion.textContent).not.toBe(before);
    else expect(p.liveRegion.textContent).toBe(before);
  });
});

describe('AC13 covers every modal and every popover of the inventory', () => {
  it('has a test block above for each dialog and each disclosure-popover entry', () => {
    const modalsAndPopovers = inventory.filter((entry) => entry.pattern === 'dialog' || entry.pattern === 'disclosure-popover');
    expect(modalsAndPopovers.length).toBe(cases('dialog').length + cases('disclosure-popover').length);
    expect(modalsAndPopovers.length).toBeGreaterThan(0);
  });
});

describe('the part 2 blocks above run over something', () => {
  // A describe.each over no entries registers no test at all, so a pattern that left the inventory would pass in silence.
  it.each(PART_TWO)('%s has at least one inventory entry for its block to run over', (pattern) => {
    expect(cases(pattern).length).toBeGreaterThan(0);
  });
});
