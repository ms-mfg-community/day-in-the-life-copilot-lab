/**
 * The keyboard model (specs/005-teaching-spa.md 2.10; child issue 9).
 *
 *   AC12  A keyboard-only traversal reaches every element listed in interactions.json and every segment, with the test failing
 *         if any pointer event is dispatched.
 *   AC13  For every modal and every hover/focus popover, Escape dismisses it and focus returns to the element that invoked it.
 *   AC14  With the "single-key shortcuts" setting off, pressing every character bound as a shortcut changes no application
 *         state; with it on, each one does.
 *
 * The shell runs in the fake DOM (helpers/fake-dom.ts), from source, through the interaction harness, as the behaviour tests
 * do. The traversal is the fake's own Tab (sequential focus navigation in document order, out of the page past the last
 * stop), its Enter on a link (the click that changes the hash) and nothing else; a pointer event of any kind reaching the
 * document fails the traversal, and a control case shows that the guard trips. The shortcuts under AC14 are read from the
 * page, `teachingSpa.keyboard.shortcuts`, so a shortcut added later is held to the same rule without a new test; the
 * application state a shortcut must change, or leave alone, is the store, the open state of the shortcuts dialog and the
 * setting itself. keyboard-browser-check.mjs repeats the traversal and the setting in real engines, where the setting is
 * also kept across a reload.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeEvent, tabOrder, type FakeElement } from './helpers/fake-dom';
import { bootFromSource, flush, readDeckIds, readInventory, type Booted, type InventoryEntry } from './helpers/interaction-harness';

interface Shortcut {
  id: string;
  key: string;
  letter: string;
  modifier: string;
  does: string;
}

interface KeyboardApi {
  shortcuts: Shortcut[];
  singleKeyShortcutsEnabled(): boolean;
  helpDialog: FakeElement | null;
  dismiss(): void;
}

/** The fake DOM does not model `checked`; the shell reads and writes it as a property, which the fake element carries as one. */
type Checkbox = FakeElement & { checked?: boolean };

const inventory = readInventory();
const deckIds = readDeckIds();

/** The pointer events that reach the document when a pointer is used: every one of them bubbles. A keyboard dispatches none. */
const POINTER_EVENTS = ['pointerdown', 'pointerup', 'pointermove', 'pointerover', 'pointerout', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout'];

/** Records every pointer event that reaches the document, from the moment it is armed. */
function armPointerGuard(page: Booted): { seen: string[] } {
  const seen: string[] = [];
  for (const type of POINTER_EVENTS) page.document.addEventListener(type, (event) => seen.push(event.type), { capture: true });
  return { seen };
}

const keyboardOf = (page: Booted): KeyboardApi => {
  const api = (page.window.teachingSpa as { keyboard?: KeyboardApi }).keyboard;
  if (api === undefined) throw new Error('keyboard: the shell did not publish window.teachingSpa.keyboard');
  return api;
};

const active = (page: Booted): FakeElement => page.document.activeElement;

const navLink = (page: Booted, segmentId: string): FakeElement => {
  const found = page.document.querySelector(`#segment-nav a[href="#/${segmentId}"]`);
  if (found === null) throw new Error(`keyboard: no nav link to ${segmentId}`);
  return found;
};

/**
 * Tab from where the focus is until `target` has it, or until every stop has been visited once. Returns the elements visited
 * on the way, `target` last. Throws when `target` is never reached: that is the failure AC12 wants to read.
 */
function tabTo(page: Booted, target: FakeElement): FakeElement[] {
  const visited: FakeElement[] = [];
  const stops = tabOrder(page.document).length + 1;
  for (let i = 0; i < stops; i += 1) {
    page.keyboard.press('Tab');
    const now = active(page);
    visited.push(now);
    if (now === target) return visited;
  }
  throw new Error(`keyboard: Tab never reached ${target.localName}#${target.getAttribute('id') ?? ''} in ${stops} presses`);
}

/** Every element Tab visits, starting after the skip link and going once round the page. */
function tabRound(page: Booted): FakeElement[] {
  const order = tabOrder(page.document);
  if (order.length === 0) throw new Error('keyboard: the page has nothing to Tab to');
  order[0].focus();
  const visited: FakeElement[] = [order[0]];
  for (let i = 1; i < order.length; i += 1) {
    page.keyboard.press('Tab');
    visited.push(active(page));
  }
  return visited;
}

/** Goes to a segment the way a keyboard user does: Tab to its link in the segment navigation, Enter. */
async function goByKeyboard(page: Booted, segmentId: string): Promise<void> {
  const link = navLink(page, segmentId);
  tabTo(page, link);
  page.keyboard.press('Enter');
  await flush();
  expect(page.spa.store.get().currentId).toBe(segmentId);
}

const entriesOf = (segmentId: string): InventoryEntry[] => inventory.filter((entry) => entry.segment === segmentId);

const reached = (visited: FakeElement[], root: FakeElement): boolean => visited.some((element) => element === root || root.contains(element));

/** What a shortcut may change: the store, whether the shortcuts dialog is open, and the setting. */
function snapshot(page: Booted): string {
  const keyboard = keyboardOf(page);
  return JSON.stringify({
    store: page.spa.store.get(),
    help: keyboard.helpDialog === null ? null : !keyboard.helpDialog.hidden,
    singleKeys: keyboard.singleKeyShortcutsEnabled(),
  });
}

/** Presses a shortcut's single-key form: the character, with Shift where the character needs it (`?`). */
function pressSingle(page: Booted, shortcut: Shortcut): FakeEvent {
  return page.keyboard.press(shortcut.key, { shift: shortcut.key !== shortcut.key.toLowerCase() || shortcut.key === '?' });
}

function pressModifier(page: Booted, shortcut: Shortcut): FakeEvent {
  return page.keyboard.press(shortcut.letter, { ctrl: true, alt: true });
}

/** Turns the setting off or on the way the page does: the checkbox changes, and says so. */
function setSingleKeys(page: Booted, on: boolean): void {
  const toggle = page.document.getElementById('shortcut-single-key') as Checkbox | null;
  if (toggle === null) throw new Error('keyboard: the shell has no #shortcut-single-key');
  toggle.checked = on;
  toggle.dispatchEvent(new FakeEvent('change', { bubbles: true }));
  expect(keyboardOf(page).singleKeyShortcutsEnabled()).toBe(on);
}

let page: Booted;
beforeEach(async () => {
  vi.useFakeTimers();
  page = await bootFromSource();
});
afterEach(() => {
  page.cleanup();
  vi.useRealTimers();
});

const settle = (): void => void vi.advanceTimersByTime(500);
const live = (): string => (page.liveRegion.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('AC12 — a keyboard-only traversal reaches every inventory element and every segment', () => {
  it('reaches, in every segment, every interaction the inventory lists for it, and every segment through its link, dispatching no pointer event', async () => {
    const guard = armPointerGuard(page);
    const covered: string[] = [];
    for (const segmentId of deckIds) {
      if (page.spa.store.get().currentId !== segmentId) await goByKeyboard(page, segmentId);
      const visited = tabRound(page);
      for (const entry of entriesOf(segmentId)) {
        const root = page.root(entry.id);
        expect(reached(visited, root), `${entry.id} (${entry.pattern}) in ${segmentId} is reached by Tab`).toBe(true);
        covered.push(entry.id);
      }
      for (const other of deckIds) expect(visited, `the link to ${other} is reached from ${segmentId}`).toContain(navLink(page, other));
    }
    expect(new Set(covered)).toEqual(new Set(inventory.map((entry) => entry.id)));
    expect(guard.seen).toEqual([]);
  });

  it('control: the guard trips on a pointer, so the traversal above could not have used one', () => {
    const guard = armPointerGuard(page);
    page.pointer.click(navLink(page, deckIds[1]));
    expect(guard.seen).toContain('pointerdown');
    expect(guard.seen).toContain('mousedown');
  });

  it('the shortcuts dialog is reached by Tab too: its button sits in the keyboard section, in the page tab order', () => {
    const button = page.document.getElementById('shortcut-help-open');
    expect(button).not.toBeNull();
    expect(tabOrder(page.document)).toContain(button as FakeElement);
    expect(tabOrder(page.document)).toContain(page.document.getElementById('shortcut-single-key') as FakeElement);
  });
});

describe('AC13 — Escape dismisses every modal and every hover/focus popover, and focus returns to what invoked it', () => {
  const modals = inventory.filter((entry) => entry.pattern === 'dialog' || entry.pattern === 'disclosure-popover');

  it('the inventory has at least one modal and one popover to hold to this', () => {
    expect(modals.some((entry) => entry.pattern === 'dialog')).toBe(true);
    expect(modals.some((entry) => entry.pattern === 'disclosure-popover')).toBe(true);
  });

  it.each(modals.map((entry) => [entry.id, entry] as const))('%s: opened from the keyboard, Escape closes it and focus is back on its trigger', async (_id, entry) => {
    await page.go(entry.segment);
    const root = page.root(entry.id);
    const trigger = root.querySelector('button');
    if (trigger === null) throw new Error(`${entry.id} has no trigger button`);
    const controlled = trigger.getAttribute('aria-controls');
    const popup = controlled === null ? null : page.document.getElementById(controlled);
    if (popup === null) throw new Error(`${entry.id}: the trigger controls nothing`);
    trigger.focus();
    if (entry.pattern === 'dialog') page.keyboard.press('Enter');
    expect(popup.hidden, `${entry.id} is open`).toBe(false);
    const down = page.keyboard.press('Escape');
    expect(down.defaultPrevented).toBe(true);
    expect(popup.hidden, `${entry.id} is closed`).toBe(true);
    expect(active(page)).toBe(trigger);
  });

  it('the shortcuts dialog, opened from its button: Escape closes it and focus is back on the button', () => {
    const button = page.document.getElementById('shortcut-help-open') as FakeElement;
    const dialog = keyboardOf(page).helpDialog as FakeElement;
    button.focus();
    page.keyboard.press('Enter');
    expect(dialog.hidden).toBe(false);
    expect(dialog.contains(active(page))).toBe(true);
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    page.keyboard.press('Escape');
    expect(dialog.hidden).toBe(true);
    expect(active(page)).toBe(button);
  });

  it('the shortcuts dialog, opened with ? from a focused element: Escape closes it and focus is back on that element', () => {
    const link = navLink(page, deckIds[1]);
    const dialog = keyboardOf(page).helpDialog as FakeElement;
    link.focus();
    page.keyboard.press('?', { shift: true });
    expect(dialog.hidden).toBe(false);
    page.keyboard.press('Escape');
    expect(dialog.hidden).toBe(true);
    expect(active(page)).toBe(link);
  });

  it('the shortcuts dialog holds Tab inside it, and puts the rest of the page out of reach while open', () => {
    const button = page.document.getElementById('shortcut-help-open') as FakeElement;
    const dialog = keyboardOf(page).helpDialog as FakeElement;
    button.focus();
    page.keyboard.press('Enter');
    const inside = tabOrder(page.document);
    expect(inside.length).toBeGreaterThan(0);
    for (const stop of inside) expect(dialog.contains(stop)).toBe(true);
    for (let i = 0; i <= inside.length; i += 1) {
      page.keyboard.press('Tab');
      expect(dialog.contains(active(page))).toBe(true);
    }
    expect(page.document.querySelectorAll('[inert]').length).toBeGreaterThan(0);
    page.keyboard.press('Escape');
    expect(page.document.querySelectorAll('[inert]').length).toBe(0);
  });

  it('dismiss() closes the shortcuts dialog when the browser has spent the Escape leaving fullscreen', () => {
    const button = page.document.getElementById('shortcut-help-open') as FakeElement;
    const keyboard = keyboardOf(page);
    button.focus();
    page.keyboard.press('Enter');
    expect((keyboard.helpDialog as FakeElement).hidden).toBe(false);
    keyboard.dismiss();
    expect((keyboard.helpDialog as FakeElement).hidden).toBe(true);
    expect(active(page)).toBe(button);
  });
});

describe('AC14 — the single-key shortcuts setting', () => {
  it('the page publishes the shortcuts, each a single character with a Ctrl+Alt modifier form, and the setting is on to begin with', () => {
    const keyboard = keyboardOf(page);
    expect(keyboard.shortcuts.length).toBeGreaterThanOrEqual(2);
    for (const shortcut of keyboard.shortcuts) {
      expect(shortcut.key).toHaveLength(1);
      expect(shortcut.modifier).toMatch(/^Ctrl\+Alt\+./);
      expect(shortcut.does.length).toBeGreaterThan(0);
    }
    expect(keyboard.singleKeyShortcutsEnabled()).toBe(true);
    expect((page.document.getElementById('shortcut-single-key') as Checkbox).checked).toBe(true);
  });

  it('with the setting off, pressing every character bound as a shortcut changes no application state, from every segment', async () => {
    setSingleKeys(page, false);
    for (const segmentId of deckIds) {
      await page.go(segmentId);
      page.main.focus();
      for (const shortcut of keyboardOf(page).shortcuts) {
        const before = snapshot(page);
        const down = pressSingle(page, shortcut);
        await flush();
        expect(snapshot(page), `${shortcut.key} in ${segmentId}`).toBe(before);
        expect(down.defaultPrevented, `${shortcut.key} in ${segmentId} is left to the browser`).toBe(false);
      }
    }
  });

  it('with the setting on, each character changes application state in at least one segment, and the key is consumed when it does', async () => {
    expect(keyboardOf(page).singleKeyShortcutsEnabled()).toBe(true);
    const changedBy = new Map<string, boolean>();
    for (const shortcut of keyboardOf(page).shortcuts) {
      let changed = false;
      for (const segmentId of deckIds) {
        page.cleanup();
        page = await bootFromSource();
        await page.go(segmentId);
        page.main.focus();
        const before = snapshot(page);
        const down = pressSingle(page, shortcut);
        await flush();
        if (snapshot(page) !== before) {
          changed = true;
          expect(down.defaultPrevented, `${shortcut.key} in ${segmentId} was consumed`).toBe(true);
        }
      }
      changedBy.set(shortcut.key, changed);
    }
    for (const [key, changed] of changedBy) expect(changed, `${key} changes state somewhere`).toBe(true);
  });

  it('the modifier form of every shortcut works with the setting off', async () => {
    setSingleKeys(page, false);
    await page.go(deckIds[1]);
    page.main.focus();
    for (const shortcut of keyboardOf(page).shortcuts) {
      page.cleanup();
      page = await bootFromSource();
      setSingleKeys(page, false);
      // Where each one acts: next and previous from the middle, the timer from its own segment, the help anywhere.
      const timerSegment = inventory.find((entry) => entry.pattern === 'segment-timer')?.segment ?? deckIds[0];
      await page.go(shortcut.id === 'timer' ? timerSegment : deckIds[1]);
      page.main.focus();
      const before = snapshot(page);
      const down = pressModifier(page, shortcut);
      await flush();
      expect(down.defaultPrevented, `${shortcut.modifier} was consumed`).toBe(true);
      expect(snapshot(page), `${shortcut.modifier} changes state`).not.toBe(before);
    }
  });

  it('n and p move through the deck in order, through the store, and say so at the ends instead of wrapping', async () => {
    page.main.focus();
    page.keyboard.press('n');
    await flush();
    expect(page.spa.store.get().currentId).toBe(deckIds[1]);
    page.keyboard.press('p');
    await flush();
    expect(page.spa.store.get().currentId).toBe(deckIds[0]);
    settle();
    page.keyboard.press('p');
    await flush();
    expect(page.spa.store.get().currentId).toBe(deckIds[0]);
    settle();
    expect(live()).toMatch(/Already at the first segment/);
    await page.go(deckIds[deckIds.length - 1]);
    settle();
    page.keyboard.press('n');
    await flush();
    expect(page.spa.store.get().currentId).toBe(deckIds[deckIds.length - 1]);
    settle();
    expect(live()).toMatch(/Already at the last segment/);
  });

  it('t starts the segment timer where there is one, and pauses it again; where there is none it says so and changes nothing', async () => {
    const timer = inventory.find((entry) => entry.pattern === 'segment-timer');
    if (timer === undefined) throw new Error('the inventory has no segment-timer');
    await page.go(timer.segment);
    page.main.focus();
    page.keyboard.press('t');
    expect((page.spa.store.get().segments[timer.segment].parameters[timer.id] as { state: string }).state).toBe('running');
    page.keyboard.press('t');
    expect((page.spa.store.get().segments[timer.segment].parameters[timer.id] as { state: string }).state).toBe('paused');
    const without = deckIds.find((id) => !inventory.some((entry) => entry.pattern === 'segment-timer' && entry.segment === id));
    if (without === undefined) throw new Error('every segment has a timer');
    await page.go(without);
    settle();
    const before = snapshot(page);
    page.keyboard.press('t');
    await flush();
    expect(snapshot(page)).toBe(before);
    settle();
    expect(live()).toMatch(/no timer/);
  });

  it('a single key is not a shortcut while a field has focus, nor while a dialog is open, nor with Ctrl or Alt alone', async () => {
    const toggle = page.document.getElementById('shortcut-single-key') as FakeElement;
    toggle.focus();
    let before = snapshot(page);
    page.keyboard.press('n');
    await flush();
    expect(snapshot(page)).toBe(before);

    page.main.focus();
    page.keyboard.press('?', { shift: true });
    expect((keyboardOf(page).helpDialog as FakeElement).hidden).toBe(false);
    before = snapshot(page);
    page.keyboard.press('n');
    await flush();
    expect(snapshot(page)).toBe(before);
    page.keyboard.press('Escape');

    page.main.focus();
    before = snapshot(page);
    page.keyboard.press('n', { ctrl: true });
    page.keyboard.press('n', { alt: true });
    page.keyboard.press('n', { meta: true });
    await flush();
    expect(snapshot(page)).toBe(before);
  });

  it('turning the setting off and on is announced, and takes effect at once', async () => {
    settle();
    setSingleKeys(page, false);
    settle();
    expect(live()).toMatch(/Single-key shortcuts off/);
    page.main.focus();
    page.keyboard.press('n');
    await flush();
    expect(page.spa.store.get().currentId).toBe(deckIds[0]);
    setSingleKeys(page, true);
    settle();
    expect(live()).toMatch(/Single-key shortcuts on/);
    page.keyboard.press('n');
    await flush();
    expect(page.spa.store.get().currentId).toBe(deckIds[1]);
  });
});
