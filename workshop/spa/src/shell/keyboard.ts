// The keyboard model of the presentation surface (specs/005-teaching-spa.md 2.10; AC12, AC13, AC14): the presenter's shortcuts,
// the setting that turns the single-character ones off, and the dialog that lists them.
//
// Four shortcuts move the presentation from anywhere on the page: the next and the previous segment, start or pause of the
// segment timer, and the list of shortcuts itself. Each is a single character key, matched on `KeyboardEvent.key` (F171: the
// character the layout gives, not the physical position), and each has a modifier equivalent, Ctrl+Alt and the same letter,
// that works whatever the setting says. SC 2.1.4 (F173) is met by the first of its three routes: a visible setting turns every
// single-character shortcut off, kept in localStorage where there is one, so a speech-input user or a presenter whose assistive
// technology uses letters is never moved by a stray character. Ctrl+Alt is the one modifier pair neither the browsers nor the
// operating systems bind for a letter; Alt alone opens a menu in Firefox on Windows, Alt+Shift switches the keyboard language.
//
// A shortcut never fires where a character has another meaning: in an editable field, inside an open dialog, on a key an
// interaction has already handled (`defaultPrevented`), or on the repeat of a held key, which 2.10 forbids depending on
// (F174: no timing). The widgets keep their own keys (arrows, Home, End, Space, Enter, Escape), which are not characters.
//
// No DOM type is named structurally here beyond what main.ts hands over: the real document and window, or the fake ones of
// the tests. The shortcuts dialog is a modal like the dialog interaction (interactions/modal.ts): Escape closes it and focus
// goes back to what invoked it, the button or the element that had focus when `?` was pressed (AC13).

import { create, listen } from '../interactions/dom';
import { BACKDROP, PANEL, createModal } from '../interactions/modal';
import type { Announcer } from './live-region';
import type { ShellStore } from './state';

export interface Shortcut {
  readonly id: 'next' | 'previous' | 'timer' | 'help';
  /** The character, as `KeyboardEvent.key` reports it for the single-key form. */
  readonly key: string;
  /** The letter of the modifier form, Ctrl+Alt+<letter>, as `KeyboardEvent.key` reports it with the modifiers held. */
  readonly letter: string;
  /** The modifier form as it is written for the reader. */
  readonly modifier: string;
  readonly does: string;
}

export const SHORTCUTS: readonly Shortcut[] = [
  { id: 'next', key: 'n', letter: 'n', modifier: 'Ctrl+Alt+N', does: 'Go to the next segment' },
  { id: 'previous', key: 'p', letter: 'p', modifier: 'Ctrl+Alt+P', does: 'Go to the previous segment' },
  { id: 'timer', key: 't', letter: 't', modifier: 'Ctrl+Alt+T', does: 'Start or pause the segment timer' },
  { id: 'help', key: '?', letter: '/', modifier: 'Ctrl+Alt+/', does: 'Show this list of shortcuts' },
];

/** Where the setting is kept between visits (2.9: localStorage works from a local file; its absence is not fatal). */
export const SINGLE_KEY_STORAGE = 'teaching-spa.single-key-shortcuts';

export interface KeyboardOptions {
  readonly document: Document;
  readonly window: Window;
  readonly store: Pick<ShellStore, 'get' | 'navigate'>;
  readonly segmentIds: readonly string[];
  readonly announce: Announcer;
  /** The id of the segment timer interaction of a segment, when it has one (the inventory says). */
  readonly timerIdOf: (segmentId: string) => string | undefined;
}

export interface Keyboard {
  readonly shortcuts: readonly Shortcut[];
  /** Whether the single-character forms are on. The modifier forms always are. */
  singleKeyShortcutsEnabled(): boolean;
  /** What the shortcuts dialog is, for a test that looks for it; null when the shell has no place to put it. */
  readonly helpDialog: HTMLElement | null;
  /** Puts away what Escape would: the shortcuts dialog, when it is open. For when the browser has spent the key leaving fullscreen. */
  dismiss(): void;
  dispose(): void;
}

const SECTION_ID = 'keyboard-settings';
const TOGGLE_ID = 'shortcut-single-key';
const OPEN_ID = 'shortcut-help-open';
export const HELP_ID = 'shortcut-help';

const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

function readSetting(win: Window): boolean {
  try {
    return win.localStorage?.getItem(SINGLE_KEY_STORAGE) !== 'off'; // on until turned off
  } catch {
    return true; // no storage (a file: URL in some browsers, F35, F37): on, as on a first visit
  }
}

function writeSetting(win: Window, on: boolean): void {
  try {
    win.localStorage?.setItem(SINGLE_KEY_STORAGE, on ? 'on' : 'off');
  } catch {
    // kept for this visit only
  }
}

/** The modifier form: Ctrl and Alt held, Meta not, and the letter; `?` and `/` share a key, so either spelling is the help. */
function isModifierForm(event: KeyboardEvent, shortcut: Shortcut): boolean {
  if (!event.ctrlKey || !event.altKey || event.metaKey) return false;
  const key = event.key.toLowerCase();
  return key === shortcut.letter || (shortcut.id === 'help' && key === '?');
}

/** The single-key form: the character and no modifier but Shift, which `?` needs and `key` already accounts for. */
function isSingleKeyForm(event: KeyboardEvent, shortcut: Shortcut): boolean {
  return !event.ctrlKey && !event.altKey && !event.metaKey && event.key === shortcut.key;
}

/** A keyboard for a shell that cannot host one: the shell's own tests run it in a stripped-down DOM double, where there is nothing to mount in. */
const NONE: Keyboard = { shortcuts: SHORTCUTS, singleKeyShortcutsEnabled: () => true, helpDialog: null, dismiss() {}, dispose() {} };

export function mountKeyboard(options: KeyboardOptions): Keyboard {
  const { document: doc, window: win, store, segmentIds, announce, timerIdOf } = options;
  if (typeof doc.addEventListener !== 'function' || typeof doc.createElement !== 'function') return NONE;
  const probe = doc.createElement('div');
  if (typeof probe.append !== 'function' || typeof probe.querySelectorAll !== 'function') return NONE;
  const section = doc.getElementById(SECTION_ID);
  const toggle = doc.getElementById(TOGGLE_ID) as HTMLInputElement | null;
  const openButton = doc.getElementById(OPEN_ID) as HTMLButtonElement | null;

  let singleKeys = readSetting(win);
  if (toggle) toggle.checked = singleKeys;

  // The dialog: the shortcuts as a table, the way back, and the setting named. It lives in the keyboard section, outside <main>,
  // so a segment that renders does not take it away, and inside the presentation root, so it is seen in fullscreen.
  let dialog: HTMLElement | null = null;
  let returnTo: HTMLElement | null = null;
  const closeButton = create(doc, 'button', { type: 'button' }, 'Close');
  if (section) {
    const titleId = `${HELP_ID}-title`;
    const rows = SHORTCUTS.map((shortcut) =>
      create(
        doc,
        'tr',
        {},
        create(doc, 'td', {}, create(doc, 'kbd', {}, shortcut.key)),
        create(doc, 'td', {}, create(doc, 'kbd', {}, shortcut.modifier)),
        create(doc, 'td', {}, shortcut.does),
      ),
    );
    dialog = create(
      doc,
      'div',
      { id: HELP_ID, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, hidden: '', style: BACKDROP },
      create(
        doc,
        'div',
        { style: PANEL },
        create(doc, 'h2', { id: titleId }, 'Keyboard shortcuts'),
        closeButton,
        create(
          doc,
          'table',
          {},
          create(doc, 'thead', {}, create(doc, 'tr', {}, create(doc, 'th', { scope: 'col' }, 'Key'), create(doc, 'th', { scope: 'col' }, 'With modifiers'), create(doc, 'th', { scope: 'col' }, 'Does'))),
          create(doc, 'tbody', {}, ...rows),
        ),
        create(
          doc,
          'p',
          {},
          'The single keys work only while "Single-key shortcuts" is checked, and never while you type in a field or while a dialog is open. The modifier forms always work. Escape closes this dialog, a popover, or pauses a running timer; Tab moves through every control on the page, and Esc or F11 leaves fullscreen.',
        ),
      ),
    );
    section.append(dialog);
  }
  const modal = dialog
    ? createModal(doc, dialog, {
        initialFocus: () => closeButton,
        returnTo: () => returnTo ?? openButton,
      })
    : null;

  const openHelp = (invoker: HTMLElement | null): void => {
    returnTo = invoker;
    modal?.open();
  };

  const where = (id: string): string => {
    const index = segmentIds.indexOf(id);
    return `segment ${index + 1} of ${segmentIds.length}`;
  };

  function move(by: 1 | -1): void {
    const current = store.get().currentId;
    const index = segmentIds.indexOf(current);
    const target = segmentIds[index + by];
    if (target === undefined) {
      announce(by > 0 ? `Already at the last segment, ${where(current)}.` : `Already at the first segment, ${where(current)}.`);
      return;
    }
    store.navigate(target); // main.ts follows the store: the segment renders, the hash moves, the move is announced
  }

  /** Start or pause: the timer's own Start or Pause control is activated, so what the key does is exactly what the button does. */
  function toggleTimer(): void {
    const current = store.get().currentId;
    const timerId = timerIdOf(current);
    const widget = timerId === undefined ? null : doc.getElementById(timerId);
    if (widget === null) {
      announce('This segment has no timer.');
      return;
    }
    const buttons = Array.from(widget.querySelectorAll('button'));
    const named = (name: string): HTMLButtonElement | undefined => buttons.find((button) => (button.textContent ?? '').trim() === name);
    const state = (store.get().segments[current]?.parameters[timerId as string] as { state?: unknown } | undefined)?.state;
    const control = state === 'running' ? named('Pause') : named('Start');
    if (control === undefined) {
      announce('This segment has no timer.');
      return;
    }
    control.click();
  }

  function run(shortcut: Shortcut, invoker: HTMLElement | null): void {
    switch (shortcut.id) {
      case 'next':
        move(1);
        break;
      case 'previous':
        move(-1);
        break;
      case 'timer':
        toggleTimer();
        break;
      case 'help':
        openHelp(invoker);
        break;
    }
  }

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.repeat === true || event.isComposing) return;
    const target = event.target as Element | null;
    if (target !== null && typeof target.closest === 'function') {
      if (target.closest(EDITABLE) !== null) return; // the character is being typed
      if (target.closest('[role="dialog"]') !== null) return; // a dialog has the page: Escape and its own controls are what work
    }
    const shortcut = SHORTCUTS.find((candidate) => isModifierForm(event, candidate) || (singleKeys && isSingleKeyForm(event, candidate)));
    if (shortcut === undefined) return;
    event.preventDefault();
    const active = doc.activeElement;
    run(shortcut, active !== null && active !== doc.body ? (active as HTMLElement) : null);
  };

  const onToggle = (): void => {
    singleKeys = toggle?.checked === true;
    writeSetting(win, singleKeys);
    announce(singleKeys ? 'Single-key shortcuts on.' : 'Single-key shortcuts off. The modifier forms still work.');
  };

  const removers = [listen(doc, 'keydown', onKeydown)];
  if (toggle) removers.push(listen(toggle, 'change', onToggle));
  if (openButton) removers.push(listen(openButton, 'click', () => openHelp(openButton)));
  removers.push(listen(closeButton, 'click', () => modal?.close()));

  return {
    shortcuts: SHORTCUTS,
    singleKeyShortcutsEnabled: () => singleKeys,
    helpDialog: dialog,
    dismiss(): void {
      modal?.close();
    },
    dispose(): void {
      modal?.dispose();
      removers.forEach((remove) => remove());
    },
  };
}
