// Behaviour of the five patterns of part 1 of the interaction inventory (specs/005-teaching-spa.md sections 2.4 and 2.10,
// AC6 and AC13): the key map of each pattern, state that outlives navigation (section 2.3), the live region, and the
// Escape and focus-restoration rules for every modal and every hover/focus popover.
//
// The shell runs in the fake DOM of helpers/fake-dom.ts, which fake-dom-browser-check.mjs holds to the behaviour of
// real Chromium and Firefox. Each describe block runs over every inventory entry of its pattern, so an entry added
// later is held to the same rules without a new test.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowser, tabOrder, type FakeElement, type Modifiers } from './helpers/fake-dom';
import {
  bootFromSource,
  contentName,
  readDeckIds,
  readInventory,
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
// every interaction

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
