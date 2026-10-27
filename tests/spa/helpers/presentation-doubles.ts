// Recording doubles for the browser APIs presentation mode drives (specs/005-teaching-spa.md section 2.5). The fake DOM
// (fake-dom.ts) models none of them, so a test installs the ones it needs on the document, the window and a navigator
// object. Every double appends to one log, because the order in which the application calls them is part of the contract:
// the speaker window, then the keyboard lock, then requestFullscreen(); exitFullscreen() before unlock().
//
// Nothing here may import a module that names the DOM (the root tsconfig has no DOM lib).

import { vi, type Mock } from 'vitest';
import { FakeEvent, type Browser, type FakeElement, type FakeEventTarget } from './fake-dom';

/** What the next requestFullscreen() on the presentation root does. */
export type FullscreenOutcome =
  | 'resolve' //            the root becomes the fullscreen element, fullscreenchange fires, then the promise resolves
  | 'resolve-then-event' // the promise resolves first; the element and the event follow a turn later
  | 'reject' //             the promise rejects with a TypeError and no event fires
  | 'error-event' //        nothing is returned (an engine whose call has no promise) and fullscreenerror fires at the root
  | 'reject-and-event' //   what a refusal is in an engine: the promise rejects and fullscreenerror fires at the root
  | 'throw' //              the call throws
  | 'pending'; //           nothing happens, yet

export interface DoublesOptions {
  /** `document.fullscreenEnabled`. `'missing'` leaves the property off, as an engine without the Fullscreen API does. */
  fullscreenEnabled?: boolean | 'missing';
  /** `navigator.keyboard` exists (it does not in Firefox or Safari, F167). */
  keyboard?: boolean;
  /** `navigator.wakeLock` exists. */
  wakeLock?: boolean;
  /** `window.getScreenDetails` exists (two engines only, F22). */
  screens?: boolean;
  /** `window.isSecureContext`. */
  secure?: boolean;
  /** `document.visibilityState` is `visible`. */
  visible?: boolean;
}

export interface Sentinel {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
  /** The user agent takes the lock back (the document went hidden): `released` turns true and `release` fires, unlogged. */
  expire: () => void;
}

export interface ScreenDouble {
  label: string;
  width: number;
  height: number;
  isPrimary: boolean;
}

export interface NavigatorDouble {
  keyboard?: { lock: Mock<(codes?: string[]) => Promise<void>>; unlock: Mock<() => void> };
  wakeLock?: { request: Mock<(type: string) => Promise<Sentinel>> };
}

export interface Doubles {
  /** Every call that matters, in the order it was made. */
  readonly log: string[];
  /** What the next requestFullscreen() does. */
  outcome: FullscreenOutcome;
  /** The arguments of every requestFullscreen() call on the root. */
  readonly requests: unknown[][];
  /** `document.fullscreenElement`: a test may set it before it fires fullscreenchange itself. */
  fullscreenElement: FakeElement | null;
  readonly root: FakeElement;
  /** What the application is given as `navigator`. */
  readonly navigator: NavigatorDouble;
  readonly keyboardLock: Mock<(codes?: string[]) => Promise<void>>;
  readonly keyboardUnlock: Mock<() => void>;
  /** The `codes` argument of every keyboard.lock() call, as it was passed (an empty or missing list would lock every key, F168). */
  readonly lockedCodes: Array<string[] | undefined>;
  readonly wakeLockRequest: Mock<(type: string) => Promise<Sentinel>>;
  readonly sentinels: Sentinel[];
  readonly open: Mock<(url?: string, target?: string, features?: string) => object | null>;
  readonly getScreenDetails: Mock<() => Promise<{ screens: ScreenDouble[] }>>;
  readonly screens: ScreenDouble[];
  /** What the doubles do when asked; a test sets one before it acts. */
  readonly behaviour: {
    popupBlocked: boolean;
    keyboardRejects: boolean;
    wakeLockRejects: boolean;
    /** The wake-lock request waits until `grantWakeLock()` is called. */
    wakeLockWaits: boolean;
    screensReject: boolean;
    /** exitFullscreen() returns at once and the element and the event follow a turn later, as in a browser. */
    exitIsAsync: boolean;
    exitRejects: boolean;
  };
  grantWakeLock(): void;
  /** The tab goes to the background (or comes back): a held wake lock is taken by the user agent, and visibilitychange fires. */
  setVisible(visible: boolean): void;
  /** The browser ends fullscreen without being asked (Esc, F11, another tab): the element goes, then the event. */
  endFullscreen(): void;
  fire(target: FakeEventTarget, type: string, bubbles?: boolean): void;
}

export function installDoubles(browser: Browser, options: DoublesOptions = {}): Doubles {
  const { document, window } = browser;
  const root = document.querySelector('[data-spa-root="presentation"]');
  if (root === null) throw new Error('doubles: the shell has no [data-spa-root="presentation"] element');

  const log: string[] = [];
  const requests: unknown[][] = [];
  const lockedCodes: Array<string[] | undefined> = [];
  const sentinels: Sentinel[] = [];
  const state = { element: null as FakeElement | null, visible: options.visible ?? true };
  const behaviour = {
    popupBlocked: false,
    keyboardRejects: false,
    wakeLockRejects: false,
    wakeLockWaits: false,
    screensReject: false,
    exitIsAsync: false,
    exitRejects: false,
  };
  const screens: ScreenDouble[] = [
    { label: 'Laptop display', width: 1920, height: 1080, isPrimary: true },
    { label: 'Projector', width: 1280, height: 720, isPrimary: false },
  ];
  let grant: (() => void) | undefined;

  // A browser fires these two at the document and the root alike, and they bubble.
  const fire = (target: FakeEventTarget, type: string, bubbles = true): void => {
    target.dispatchEvent(new FakeEvent(type, { bubbles }));
  };

  // The Fullscreen API
  if (options.fullscreenEnabled !== 'missing') {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: options.fullscreenEnabled ?? true });
  }
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => state.element });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (state.visible ? 'visible' : 'hidden') });
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    value: (): Promise<void> => {
      log.push('exitFullscreen');
      if (behaviour.exitRejects) return Promise.reject(new TypeError('Document not fullscreen'));
      const leave = (): void => {
        state.element = null;
        fire(document, 'fullscreenchange');
      };
      if (behaviour.exitIsAsync) queueMicrotask(() => queueMicrotask(leave));
      else leave();
      return Promise.resolve();
    },
  });

  // The Keyboard Lock API
  const keyboardLock = vi.fn(async (codes?: string[]): Promise<void> => {
    log.push('lock');
    lockedCodes.push(codes);
    if (behaviour.keyboardRejects) throw new DOMException('Not granted', 'InvalidStateError');
  });
  const keyboardUnlock = vi.fn((): void => {
    log.push('unlock');
  });

  // The Screen Wake Lock API
  const makeSentinel = (): Sentinel => {
    const listeners: Array<() => void> = [];
    const sentinel: Sentinel = {
      released: false,
      release: async (): Promise<void> => {
        log.push('wakeLock.release');
        sentinel.expire();
      },
      addEventListener: (type, listener) => {
        if (type === 'release') listeners.push(listener);
      },
      expire: () => {
        if (sentinel.released) return;
        sentinel.released = true;
        for (const listener of [...listeners]) listener();
      },
    };
    return sentinel;
  };
  const wakeLockRequest = vi.fn(async (type: string): Promise<Sentinel> => {
    log.push(`wakeLock.request:${type}`);
    if (behaviour.wakeLockWaits) await new Promise<void>((resolve) => (grant = resolve));
    if (behaviour.wakeLockRejects) throw new DOMException('Not allowed', 'NotAllowedError');
    const sentinel = makeSentinel();
    sentinels.push(sentinel);
    return sentinel;
  });

  // The window: open(), and where the engine has it the Window Management API
  const open = vi.fn((_url?: string, _target?: string, _features?: string): object | null => {
    log.push('open');
    return behaviour.popupBlocked ? null : { closed: false };
  });
  const getScreenDetails = vi.fn(async (): Promise<{ screens: ScreenDouble[] }> => {
    log.push('getScreenDetails');
    if (behaviour.screensReject) throw new DOMException('Permission denied', 'NotAllowedError');
    return { screens };
  });
  Object.assign(window, { open, isSecureContext: options.secure ?? true });
  if (options.screens === true) Object.assign(window, { getScreenDetails });

  const navigator: NavigatorDouble = {};
  if (options.keyboard !== false) navigator.keyboard = { lock: keyboardLock, unlock: keyboardUnlock };
  if (options.wakeLock !== false) navigator.wakeLock = { request: wakeLockRequest };

  const doubles: Doubles = {
    log,
    outcome: 'resolve',
    requests,
    get fullscreenElement() {
      return state.element;
    },
    set fullscreenElement(element: FakeElement | null) {
      state.element = element;
    },
    root,
    navigator,
    keyboardLock,
    keyboardUnlock,
    lockedCodes,
    wakeLockRequest,
    sentinels,
    open,
    getScreenDetails,
    screens,
    behaviour,
    grantWakeLock: () => grant?.(),
    setVisible(visible: boolean): void {
      state.visible = visible;
      if (!visible) for (const sentinel of sentinels) sentinel.expire();
      fire(document, 'visibilitychange');
    },
    endFullscreen(): void {
      state.element = null;
      fire(document, 'fullscreenchange');
    },
    fire,
  };

  Object.assign(root, {
    requestFullscreen: (...args: unknown[]): Promise<void> | undefined => {
      log.push('requestFullscreen');
      requests.push(args);
      switch (doubles.outcome) {
        case 'resolve':
          return new Promise<void>((resolve) =>
            queueMicrotask(() => {
              state.element = root;
              fire(document, 'fullscreenchange');
              resolve();
            }),
          );
        case 'resolve-then-event':
          queueMicrotask(() =>
            queueMicrotask(() => {
              state.element = root;
              fire(document, 'fullscreenchange');
            }),
          );
          return Promise.resolve();
        case 'reject':
          return Promise.reject(new TypeError('Fullscreen request denied'));
        case 'error-event':
          queueMicrotask(() => fire(root, 'fullscreenerror'));
          return undefined;
        case 'reject-and-event':
          queueMicrotask(() => fire(root, 'fullscreenerror'));
          return Promise.reject(new TypeError('Fullscreen request denied'));
        case 'throw':
          throw new TypeError('Fullscreen request denied');
        case 'pending':
          return new Promise<void>(() => {});
      }
    },
  });
  // Anything else asked to go fullscreen is a defect of the application: it must be the one root and nothing more.
  for (const other of [document.querySelector('main'), document.querySelector('nav'), document.body, document.documentElement]) {
    if (other !== null) Object.assign(other, { requestFullscreen: () => log.push(`requestFullscreen:${other.localName}`) });
  }

  return doubles;
}
