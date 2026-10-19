// Presentation mode (spec 2.5, 2.6): fullscreen on one root, started by a click, with every way it can fail or end handled.
//
// The browser owns fullscreen. It can refuse a request (a rejected promise, a `fullscreenerror` event, or both) and it can
// end fullscreen whenever it likes (Esc, F11, another window taking over) without the page being asked. So nothing here
// assumes. The document says what happened through `fullscreenchange`, and the page follows it back to the segment it was
// showing: the controller never navigates, it only reads `store.get().currentId`. The one thing it does for a segment that
// opens is the scroll to its top that main.ts makes for the window, because in fullscreen the root is what scrolls.
//
// No DOM type is named in this module. Its tests drive it with doubles and the root tsconfig has no DOM lib, so each browser
// object arrives as a structural type and main.ts casts the real ones once.

import type { Announcer } from './live-region';
import type { ShellStore } from './state';

export interface PresentationEvent {
  readonly target?: unknown;
}

type Listener = (event: PresentationEvent) => void;

interface Listenable {
  addEventListener(type: string, listener: Listener): void;
  removeEventListener(type: string, listener: Listener): void;
}

/** The part of an element the controller touches. */
export interface PresentationElement extends Listenable {
  hidden: boolean;
  disabled?: boolean;
  checked?: boolean;
  value?: string;
  textContent: string | null;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  removeAttribute(name: string): void;
  focus?(options?: { preventScroll?: boolean }): void;
  replaceChildren?(...children: unknown[]): void;
}

/** The element that goes fullscreen. The Window Management `screen` option is not in every lib.dom, so it is typed here. */
export interface PresentationRoot extends PresentationElement {
  /** What scrolls while the root is fullscreen: the window no longer does. */
  scrollTop: number;
  requestFullscreen(options?: { screen?: unknown }): PromiseLike<unknown> | void;
}

export interface PresentationDocument extends Listenable {
  readonly fullscreenEnabled?: boolean;
  readonly fullscreenElement?: unknown;
  readonly visibilityState?: string;
  readonly activeElement?: unknown;
  exitFullscreen?(): PromiseLike<unknown> | void;
  getElementById(id: string): PresentationElement | null;
  querySelector(selector: string): PresentationRoot | null;
  createElement(tagName: string): PresentationElement;
}

/** A `ScreenDetailed` as far as the controller reads one. It is handed back to `requestFullscreen` untouched. */
export interface PresentationScreen {
  readonly label?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface PresentationWindow {
  readonly isSecureContext?: boolean;
  open?(url: string, target?: string, features?: string): unknown;
  getScreenDetails?(): PromiseLike<{ readonly screens: ArrayLike<PresentationScreen> }>;
}

export interface PresentationWakeLockSentinel {
  readonly released?: boolean;
  release(): PromiseLike<unknown> | void;
  addEventListener?(type: string, listener: () => void): void;
}

export interface PresentationNavigator {
  readonly keyboard?: {
    lock?(keyCodes?: string[]): PromiseLike<unknown> | void;
    unlock?(): void;
  };
  readonly wakeLock?: {
    request?(type: 'screen'): PromiseLike<PresentationWakeLockSentinel>;
  };
}

export interface PresentationOptions {
  readonly document: PresentationDocument;
  readonly window: PresentationWindow;
  readonly navigator?: PresentationNavigator;
  readonly store: Pick<ShellStore, 'get' | 'subscribe'>;
  readonly announce: Announcer;
  /** Names a segment for the messages that say where the window is. */
  readonly describeSegment?: (id: string) => string;
}

export interface Presentation {
  /** True from the moment the root is the fullscreen element until fullscreen ends. */
  readonly active: boolean;
  /** What the Present control does. Call it from a user gesture: without one the browser refuses to go fullscreen. */
  present(): void;
  /** What the Exit control does. */
  exit(): void;
  /** Removes every listener and hands back the keyboard and the wake lock if they are held. */
  dispose(): void;
}

/**
 * The keys held for the slides while keyboard lock is on. The spec names none, so this is the implementation's choice: the
 * keys that move through a deck. It never holds Escape (SC 2.1.2: the reader must always be able to leave, F84, F163) and it
 * is never empty, because an empty list locks every key (F168).
 */
export const KEYBOARD_LOCK_CODES: readonly string[] = ['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Space'];

const ROOT_SELECTOR = '[data-spa-root="presentation"]';
// The speaker script route belongs to the speaker window issue. A name, so a second activation reuses the window.
const SCRIPT_URL = '#/script';
const SCRIPT_WINDOW = 'teaching-spa-script';

const ENTERED = 'Presentation mode on. Press Esc or F11 to exit fullscreen.';
const EXIT_FAILED = 'Could not leave fullscreen. Press Esc or F11 to exit fullscreen.';
const SCRIPT_BLOCKED =
  'The speaker script window was blocked by the browser. Allow pop-ups for this page, or open #/script yourself.';
const KEYBOARD_REFUSED = 'Keyboard lock was not granted by the browser, so some shortcuts may still be captured.';
const KEYBOARD_UNAVAILABLE = 'Keyboard lock is not available in this browser, so it cannot be turned on.';
const WAKE_UNAVAILABLE = 'Screen wake lock is unavailable here, so the screen may dim.';
const WAKE_REFUSED = 'Screen wake lock was not granted, so the screen may dim.';
// Spec 2.6: the manual route is the one that always works, and nothing may say a monitor was picked when it was not.
const SCREENS_LISTED = "Audience screens are listed. Pick one, or keep this window's screen, then activate Present.";
const SCREENS_REFUSED =
  'Choosing a screen is not available. To put the slides on the audience monitor, move this browser window onto the audience monitor, then activate Present.';
const OWN_SCREEN = "This window's screen";

const couldNotStart = (where: string): string => `Fullscreen could not start. The window is still showing ${where}.`;
const ended = (where: string): string => `Presentation mode off. Fullscreen ended and the window is showing ${where}.`;

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as { then?: unknown } | null | undefined)?.then === 'function';
}

function describeScreen(screen: PresentationScreen, index: number): string {
  const name = typeof screen.label === 'string' && screen.label !== '' ? screen.label : `Screen ${index + 1}`;
  const size = typeof screen.width === 'number' && typeof screen.height === 'number' ? ` (${screen.width} x ${screen.height})` : '';
  return name + size;
}

interface Notes {
  script?: string;
  keyboard?: string;
  wakeLock?: string;
}

/**
 * Wires the Present and Exit controls to the presentation root. Returns `undefined` when the page has no presentation root
 * or no controls (a shell that predates them, or a document with no selector support), so the rest of the shell still boots.
 */
export function mountPresentation(options: PresentationOptions): Presentation | undefined {
  const { document: doc, window: win, navigator: nav, store, announce } = options;
  const describe = options.describeSegment ?? (() => 'the same segment');
  if (typeof doc?.querySelector !== 'function') return undefined;

  const foundRoot = doc.querySelector(ROOT_SELECTOR);
  const foundStart = doc.getElementById('present-start');
  const foundExit = doc.getElementById('present-exit');
  if (!foundRoot || !foundStart || !foundExit) return undefined;
  // Bound again so the helpers below, which are hoisted declarations, see them as present.
  const root: PresentationRoot = foundRoot;
  const start: PresentationElement = foundStart;
  const exitButton: PresentationElement = foundExit;
  const panel = doc.getElementById('present-options');
  const keyboardToggle = doc.getElementById('present-keyboard-lock');
  const keyboardHint = doc.getElementById('present-keyboard-hint');
  const scriptToggle = doc.getElementById('present-open-script');
  const chooseButton = doc.getElementById('present-choose-screen');
  const screenField = doc.getElementById('present-screen-field');
  const screenSelect = doc.getElementById('present-screen');
  const unavailable = doc.getElementById('present-unavailable');
  const notesElement = doc.getElementById('present-notes');

  // idle: windowed. requesting: the request is out and the browser has not answered. presenting: the root is fullscreen.
  let phase: 'idle' | 'requesting' | 'presenting' = 'idle';
  let activation = 0; // which activation an answer belongs to: a late answer to an earlier one is ignored
  let locked = false;
  let sentinel: PresentationWakeLockSentinel | undefined;
  let wakePending = false;
  let wakeToken = 0;
  let notes: Notes = {};
  let base = '';
  let screens: PresentationScreen[] = [];
  let disposed = false;

  const currentSegment = (): string => describe(store.get().currentId);
  const supported = (): boolean => doc.fullscreenEnabled === true && typeof root.requestFullscreen === 'function';
  const keyboardAvailable = (): boolean => typeof nav?.keyboard?.lock === 'function';
  const noteTexts = (): string[] => [notes.script, notes.keyboard, notes.wakeLock].filter((text): text is string => !!text);

  // `createAnnouncer` keeps only the latest message, so what a later event adds is said together with what came before.
  function speak(): void {
    announce([base, ...noteTexts()].filter(Boolean).join(' '));
  }

  function render(): void {
    if (notesElement) notesElement.textContent = noteTexts().join(' ');
  }

  function showWindowed(): void {
    root.setAttribute('data-presentation', 'windowed');
    start.hidden = false;
    if (panel) panel.hidden = false;
    exitButton.hidden = true;
  }

  function releaseKeyboard(): void {
    if (!locked) return;
    locked = false;
    try {
      nav?.keyboard?.unlock?.();
    } catch {
      // nothing held that could be undone
    }
  }

  function releaseSentinel(held: PresentationWakeLockSentinel): void {
    if (held.released === true) return; // the browser already took it back
    try {
      void Promise.resolve(held.release()).catch(() => undefined);
    } catch {
      // already released
    }
  }

  function releaseWakeLock(): void {
    wakeToken += 1; // an answer still on its way belongs to a presentation that is over
    wakePending = false;
    const held = sentinel;
    sentinel = undefined;
    if (held) releaseSentinel(held);
  }

  // Wake lock is an enhancement (F70-F77): needs a secure context and a visible document, and may be refused. Nothing here
  // can fail presentation mode. A note is added only when something is missing for good, not while the page is hidden.
  function requestWakeLock(): void {
    if (disposed || phase !== 'presenting') return;
    if (sentinel?.released === true) sentinel = undefined;
    if (sentinel || wakePending) return;
    if (win.isSecureContext === false || typeof nav?.wakeLock?.request !== 'function') {
      notes.wakeLock = WAKE_UNAVAILABLE;
      return;
    }
    if (doc.visibilityState !== 'visible') return;
    wakePending = true;
    const token = ++wakeToken;
    let answer: Promise<PresentationWakeLockSentinel>;
    try {
      answer = Promise.resolve(nav.wakeLock.request('screen'));
    } catch (error) {
      answer = Promise.reject(error);
    }
    answer.then(
      (granted) => {
        if (token !== wakeToken || disposed || phase !== 'presenting') {
          releaseSentinel(granted); // presentation ended while the request was out: hand it straight back
          return;
        }
        wakePending = false;
        sentinel = granted;
        granted.addEventListener?.('release', () => {
          if (sentinel === granted) sentinel = undefined; // the browser took it (hidden page): ask again when visible
        });
        if (notes.wakeLock) {
          delete notes.wakeLock;
          render();
        }
      },
      () => {
        if (token !== wakeToken || disposed || phase !== 'presenting') return;
        wakePending = false;
        if (notes.wakeLock === WAKE_REFUSED) return; // already said: do not repeat it on every return to the tab
        notes.wakeLock = WAKE_REFUSED;
        render();
        speak();
      },
    );
  }

  function enter(): void {
    const startHadFocus = doc.activeElement === start;
    phase = 'presenting';
    root.setAttribute('data-presentation', 'presenting');
    exitButton.hidden = false;
    start.hidden = true;
    if (panel) panel.hidden = true;
    // The control the reader used has gone, so focus follows to the one that undoes it. It does not scroll: the slide was just
    // on screen, and the controls are kept in view in fullscreen (index.html), so there is nothing to bring into view.
    if (startHadFocus) exitButton.focus?.({ preventScroll: true });
    base = ENTERED;
    requestWakeLock();
    render();
    speak();
  }

  function leave(): void {
    const exitHadFocus = doc.activeElement === exitButton;
    phase = 'idle';
    releaseWakeLock();
    releaseKeyboard();
    notes = {};
    showWindowed();
    if (exitHadFocus) start.focus?.();
    base = ended(currentSegment());
    render();
    speak();
  }

  // Idempotent by its phase gate: the event, the rejection, or both, report the failure once.
  function fail(): void {
    if (phase !== 'requesting') return;
    phase = 'idle';
    releaseKeyboard();
    notes = notes.script ? { script: notes.script } : {};
    showWindowed();
    base = couldNotStart(currentSegment());
    render();
    speak();
  }

  function exitFailed(): void {
    if (disposed || phase !== 'presenting') return;
    base = EXIT_FAILED;
    speak();
  }

  // The one place that decides what the browser's fullscreen state means for the page.
  function reconcile(): void {
    if (disposed) return;
    const element = doc.fullscreenElement;
    if (element === root) {
      if (phase !== 'presenting') enter();
    } else if (element === null || element === undefined) {
      if (phase === 'presenting') leave(); // ended without the page asking, or after it asked: the same way back
    }
    // Any other element is fullscreen: not ours, and not a reason to leave presentation mode.
  }

  function openSpeakerScript(): void {
    let opened: unknown = null;
    try {
      opened = win.open?.(SCRIPT_URL, SCRIPT_WINDOW); // no `noopener`: the opener is how the two windows stay in step (F43-F46)
    } catch {
      opened = null;
    }
    if (opened === null || opened === undefined) {
      notes.script = SCRIPT_BLOCKED;
      announce(SCRIPT_BLOCKED);
    }
  }

  function lockKeyboard(token: number): void {
    let answer: Promise<unknown>;
    try {
      answer = Promise.resolve(nav?.keyboard?.lock?.([...KEYBOARD_LOCK_CODES]));
    } catch (error) {
      answer = Promise.reject(error);
    }
    locked = true;
    answer.catch(() => {
      if (token !== activation || !locked) return;
      locked = false;
      notes.keyboard = KEYBOARD_REFUSED;
      render();
      if (phase === 'presenting') speak();
    });
  }

  function chosenScreen(): PresentationScreen | undefined {
    const value = screenSelect?.value;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) return undefined;
    return screens[Number(value)];
  }

  // The activation handler. Order is normative (spec 2.5) and nothing awaits before `requestFullscreen`, which consumes the
  // transient activation a pop-up and the keyboard lock also need (F1, F46, F160, F163).
  function present(): void {
    if (disposed || phase !== 'idle' || !supported()) return;
    const token = ++activation;
    phase = 'requesting';
    notes = {};
    base = '';

    if (scriptToggle?.checked === true) openSpeakerScript();
    if (keyboardToggle?.checked === true && keyboardAvailable()) lockKeyboard(token);

    const screen = chosenScreen();
    let answer: unknown;
    try {
      answer = screen ? root.requestFullscreen({ screen }) : root.requestFullscreen(); // C1: no activation rejection of its own
    } catch {
      fail();
      return;
    }
    if (isThenable(answer)) {
      answer.then(
        () => {
          if (token === activation) reconcile();
        },
        () => {
          if (token === activation) fail();
        },
      );
    }
  }

  // F163: leave fullscreen first, then hand the keyboard back. A failed exit leaves the reader presenting, with Esc and F11
  // still working (the lock never held Escape), so the lock stays released: a held key cannot trap anyone (SC 2.1.2).
  function exit(): void {
    if (disposed || phase !== 'presenting') return;
    if (doc.fullscreenElement === null) {
      reconcile();
      return;
    }
    let answer: unknown;
    try {
      if (typeof doc.exitFullscreen !== 'function') throw new TypeError('exitFullscreen is not available');
      answer = doc.exitFullscreen();
    } catch {
      exitFailed();
      return;
    }
    releaseKeyboard();
    void Promise.resolve(answer).then(reconcile, exitFailed);
  }

  function onFullscreenError(event: PresentationEvent): void {
    if (disposed || phase !== 'requesting') return; // a stale or unrelated error is not this request's failure
    if (event.target !== root && event.target !== doc) return;
    fail();
  }

  const onFullscreenChange = (): void => reconcile();
  const onVisibilityChange = (): void => {
    if (doc.visibilityState === 'visible') requestWakeLock(); // F75: a hidden page loses the lock, a visible one asks again
  };
  const onStart = (): void => present();
  const onExit = (): void => exit();

  function listScreens(details: { readonly screens: ArrayLike<PresentationScreen> } | undefined): void {
    if (disposed) return;
    const found = Array.from(details?.screens ?? []);
    if (found.length === 0) {
      refuseScreens();
      return;
    }
    screens = found;
    if (screenSelect && screenField) {
      const entry = (value: string, label: string): PresentationElement => {
        const option = doc.createElement('option');
        option.setAttribute('value', value);
        option.textContent = label;
        return option;
      };
      screenSelect.replaceChildren?.(
        entry('', OWN_SCREEN),
        ...found.map((screen, index) => entry(String(index), describeScreen(screen, index))),
      );
      screenField.hidden = false;
      screenSelect.focus?.();
    }
    announce(SCREENS_LISTED);
  }

  function refuseScreens(): void {
    if (disposed) return;
    screens = [];
    screenSelect?.replaceChildren?.();
    if (screenField) screenField.hidden = true;
    announce(SCREENS_REFUSED);
  }

  // Asked only when the reader asks (a prompt on page load would be a surprise), and only for what the browser offers.
  function onChooseScreen(): void {
    if (disposed || typeof win.getScreenDetails !== 'function') return;
    let answer: Promise<{ readonly screens: ArrayLike<PresentationScreen> }>;
    try {
      answer = Promise.resolve(win.getScreenDetails());
    } catch (error) {
      answer = Promise.reject(error);
    }
    answer.then(listScreens, refuseScreens);
  }

  // What the controls say before anything is pressed.
  root.setAttribute('data-presentation', 'windowed');
  if (!supported()) {
    start.disabled = true;
    start.setAttribute('aria-disabled', 'true');
    start.setAttribute('aria-describedby', 'present-unavailable');
    if (unavailable) unavailable.hidden = false;
  }
  if (!keyboardAvailable() && keyboardToggle) {
    keyboardToggle.disabled = true;
    if (keyboardHint) {
      keyboardHint.textContent = KEYBOARD_UNAVAILABLE;
      keyboardHint.hidden = false;
    }
  }
  if (chooseButton) chooseButton.hidden = typeof win.getScreenDetails !== 'function';

  // A segment opens from its top (main.ts, openAtTop). That scrolls the window, which is not what scrolls in fullscreen, so
  // the root is put back at the top here. Only a change of segment does it: a step revealed inside one leaves the reader
  // where they are. main.ts subscribes first, so the new segment is already on the page when this runs.
  const unsubscribe = store.subscribe((next, previous) => {
    if (phase === 'presenting' && next.currentId !== previous.currentId) root.scrollTop = 0;
  });

  start.addEventListener('click', onStart);
  exitButton.addEventListener('click', onExit);
  chooseButton?.addEventListener('click', onChooseScreen);
  doc.addEventListener('fullscreenchange', onFullscreenChange);
  // `fullscreenerror` is fired at the element and bubbles, but a browser that does not bubble it, or a root that has left the
  // document, still has to be heard: both places, and the phase gate makes the second report a no-op.
  doc.addEventListener('fullscreenerror', onFullscreenError);
  root.addEventListener('fullscreenerror', onFullscreenError);
  doc.addEventListener('visibilitychange', onVisibilityChange);

  return {
    get active(): boolean {
      return phase === 'presenting';
    },
    present,
    exit,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      start.removeEventListener('click', onStart);
      exitButton.removeEventListener('click', onExit);
      chooseButton?.removeEventListener('click', onChooseScreen);
      doc.removeEventListener('fullscreenchange', onFullscreenChange);
      doc.removeEventListener('fullscreenerror', onFullscreenError);
      root.removeEventListener('fullscreenerror', onFullscreenError);
      doc.removeEventListener('visibilitychange', onVisibilityChange);
      unsubscribe();
      releaseKeyboard();
      releaseWakeLock();
    },
  };
}
