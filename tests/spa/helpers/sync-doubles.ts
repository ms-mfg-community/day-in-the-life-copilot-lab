// Doubles for the speaker-sync tests (specs/005-teaching-spa.md 2.7, AC9 and AC10): a small laboratory of windows that talk
// to each other the way browser windows do, so the transports are exercised end to end and not against a stub that says yes.
//
//   - A `postMessage` is delivered a turn later, only when its target origin matches the receiver (`*` always, `/` for the
//     same origin, an origin only for a receiver that is not opaque), and the receiver is told the sender's window as
//     `event.source`: the same object every time, as a WindowProxy is. An invalid target origin throws a SyntaxError, so
//     `window.origin`, which reads "null" in an opaque document, is not a target origin that works.
//   - A `BroadcastChannel` reaches the other channels of the same name and origin, never the one that sent. A sandboxed (opaque)
//     document shares no channel and no storage with any other window; a `file:` page (`file: true`) is opaque to the handles of
//     other windows and yet shares one channel and one storage with every other `file:` page, as Chromium has it.
//   - `localStorage` fires `storage` at the other windows of the origin and never at the writer, and only when the value
//     changed. Its getter can throw a SecurityError, as it does in an opaque document, and each method can throw too.
//
// Nothing here may import a module that names the DOM (the root tsconfig has no DOM lib).

import { vi } from 'vitest';
import { FakeEvent, FakeLocation, FakeWindow } from './fake-dom';

export type Via = 'broadcastchannel' | 'postmessage' | 'storage';

/** How `window.localStorage` behaves. */
export type StorageMode = 'ok' | 'absent' | 'getter-throws' | 'get-throws' | 'set-throws' | 'remove-throws';

export interface Traffic {
  readonly via: Via;
  readonly from: string;
  readonly data: unknown;
  readonly to?: string;
  /** The second argument of the postMessage call, as it was passed. */
  readonly targetOrigin?: string;
  /** The storage key that was written. */
  readonly key?: string;
}

export interface LabWindowOptions {
  /** `window.origin`, the origin of the document as the page reads it. */
  origin?: string;
  /** The window has no `window.origin` (an engine that predates it), and only `location.origin` to go on. */
  noOriginApi?: boolean;
  /**
   * The document's origin is opaque (a sandboxed document, or a page from a file: URL in an engine that says so): `window.origin` is
   * "null", the `localStorage` getter throws, and no other window shares its channels or its storage.
   */
  opaque?: boolean;
  /**
   * A page that runs from a `file:` URL, as Chromium runs it (measured, not assumed): `window.origin` is "null" and `location.origin` is
   * "file://", a read through the handle of another window throws (so the window that opened this one cannot be told from any other), a
   * message says its origin is "null", and yet every `file:` page shares one BroadcastChannel and one localStorage, whose `storage`
   * events reach the others. So an unrelated presentation that is open in another tab hears everything a script window says over either.
   */
  file?: boolean;
  /** `location.origin`, which is the origin of the URL and not of the document, so a sandboxed document keeps it. Default: `origin`. */
  locationOrigin?: string;
  /** `location.search`. */
  search?: string;
  /** `BroadcastChannel` exists (`false`), or exists and cannot be constructed (`'throws'`). Default: it exists. */
  broadcast?: boolean | 'throws';
  storage?: StorageMode;
}

/** What `window.open()` returns and `window.opener` is: the other window as this one sees it. */
export interface WindowHandle {
  readonly closed: boolean;
  readonly target: LabWindow;
  postMessage(data: unknown, targetOrigin?: string): void;
}

const insecure = (): DOMException => new DOMException('The operation is insecure.', 'SecurityError');

/** The value as the platform would carry it: a structured clone, so a function or a symbol in it is a failure here as it would be there. */
const carried = <T>(value: T): T => structuredClone(value);

function parsed(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** A string that `postMessage` accepts as a target origin: `*`, `/`, or an absolute URL. */
const isTargetOrigin = (target: string): boolean => target === '*' || target === '/' || /^[a-z][a-z0-9+.-]*:\/\/[^/?#\s]+([/?#].*)?$/i.test(target);

export class LabChannel {
  onmessage: ((event: unknown) => void) | null = null;
  closed = false;
  private readonly listeners = new Set<(event: unknown) => void>();

  constructor(
    readonly name: string,
    readonly owner: LabWindow,
    private readonly lab: Lab,
  ) {
    lab.join(this);
  }

  postMessage(data: unknown): void {
    if (this.closed) throw new DOMException('The BroadcastChannel is closed.', 'InvalidStateError');
    this.lab.broadcast(this, data);
  }

  close(): void {
    this.closed = true;
    this.listeners.clear();
    this.onmessage = null;
    this.lab.leave(this);
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    if (type === 'message') this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: (event: unknown) => void): void {
    if (type === 'message') this.listeners.delete(listener);
  }

  receive(event: unknown): void {
    if (this.closed) return;
    this.onmessage?.(event);
    for (const listener of [...this.listeners]) listener(event);
  }

  /** The listeners that would be called: a test's proof that a closed channel holds none. */
  get listenerCount(): number {
    return this.listeners.size + (this.onmessage === null ? 0 : 1);
  }
}

export class LabStorage {
  constructor(
    private readonly lab: Lab,
    private readonly owner: LabWindow,
    private readonly store: Map<string, string>,
    private readonly mode: StorageMode,
  ) {}

  get length(): number {
    return this.store.size;
  }

  getItem(key: string): string | null {
    if (this.mode === 'get-throws') throw insecure();
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.mode === 'set-throws') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    const next = String(value);
    const old = this.store.get(key) ?? null;
    this.store.set(key, next);
    this.lab.traffic.push({ via: 'storage', from: this.owner.name, key, data: parsed(next) });
    if (old !== next) this.lab.fireStorage(this.owner, key, old, next);
  }

  removeItem(key: string): void {
    if (this.mode === 'remove-throws') throw insecure();
    const old = this.store.get(key) ?? null;
    if (old === null) return;
    this.store.delete(key);
    this.lab.fireStorage(this.owner, key, old, null);
  }

  keys(): string[] {
    return [...this.store.keys()];
  }
}

class LabLocation extends FakeLocation {
  readonly reload = vi.fn();

  constructor(
    view: FakeWindow,
    readonly origin: string,
    public search: string,
  ) {
    super(view);
  }
}

/** A window of the laboratory. It is a fake-dom window, so the whole shell can be booted in one. */
export class LabWindow extends FakeWindow {
  declare readonly origin: string | undefined;
  declare readonly location: LabLocation;
  declare readonly BroadcastChannel: (new (name: string) => LabChannel) | undefined;
  declare readonly localStorage: LabStorage | undefined;
  readonly trueOrigin: string;
  /** An opaque document: its handle cannot be read by another window. A `file:` page is one, and still shares its channels and storage. */
  readonly opaque: boolean;
  readonly fileLike: boolean;
  readonly storageObject: LabStorage | undefined;
  /** `window.opener`: what the window that opened this one is to it, or null. */
  opener: unknown = null;
  closed = false;
  /** `window.open`. It is blocked (returns null) until a test says what it opens. */
  readonly open = vi.fn((_url?: string, _target?: string, _features?: string): unknown => null);

  constructor(
    readonly lab: Lab,
    readonly name: string,
    options: LabWindowOptions = {},
  ) {
    super();
    this.fileLike = options.file === true;
    this.opaque = options.opaque === true || this.fileLike;
    const origin = this.opaque ? 'null' : (options.origin ?? 'https://spa.test');
    this.trueOrigin = this.fileLike ? 'file://' : this.opaque ? `opaque:${name}` : origin;
    const locationOrigin = options.locationOrigin ?? (this.fileLike ? 'file://' : this.opaque ? 'https://spa.test' : origin);
    Object.defineProperty(this, 'location', { configurable: true, value: new LabLocation(this, locationOrigin, options.search ?? '') });
    Object.defineProperty(this, 'origin', { configurable: true, value: options.noOriginApi === true ? undefined : origin });

    const broadcast = options.broadcast ?? true;
    if (broadcast !== false) {
      const owner = this;
      const lab = this.lab;
      Object.defineProperty(this, 'BroadcastChannel', {
        configurable: true,
        value: class extends LabChannel {
          constructor(channelName: string) {
            if (broadcast === 'throws') throw new DOMException('BroadcastChannel is not allowed here.', 'SecurityError');
            super(channelName, owner, lab);
          }
        },
      });
    }

    const mode: StorageMode = options.storage ?? (this.opaque && !this.fileLike ? 'getter-throws' : 'ok');
    if (mode === 'getter-throws') {
      Object.defineProperty(this, 'localStorage', {
        configurable: true,
        get: (): never => {
          throw insecure();
        },
      });
    } else if (mode !== 'absent') {
      this.storageObject = new LabStorage(this.lab, this, this.lab.storeFor(this), mode);
      Object.defineProperty(this, 'localStorage', { configurable: true, get: () => this.storageObject });
    }
  }

  /** The storage the window could read, for a test that looks at what the application left behind. */
  keysInStorage(): string[] {
    return [...this.lab.storeFor(this).keys()];
  }

  /**
   * The page that runs in this window is gone and has said nothing: it is replaced, as a reload replaces it, and the window itself, which is
   * the same WindowProxy to every window that holds it, stays. Whatever ran there no longer listens, on the window or on a channel, and
   * nothing it was going to say is said. Properties that it set on the window are not touched: a test for which a name must be gone from
   * the window takes it off itself.
   */
  unload(): void {
    this.lab.unload(this);
  }
}

export class Lab {
  readonly traffic: Traffic[] = [];
  readonly windows: LabWindow[] = [];
  /**
   * What a read of a window of another origin (an opaque one included) does: through the handle of one, a browser throws a SecurityError
   * for everything but the few properties a handle always has. Off, it reads as not there (see `proxy`). A test of what code does with a
   * window it cannot read turns it on, and keeps those handles out of `expect`, which looks at what it is given.
   */
  throwOnCrossOrigin = false;
  private readonly channels = new Map<string, Set<LabChannel>>();
  private readonly stores = new Map<string, Map<string, string>>();
  private readonly handles = new Map<LabWindow, Map<LabWindow, WindowHandle>>();

  window(name: string, options: LabWindowOptions = {}): LabWindow {
    const win = new LabWindow(this, name, options);
    this.windows.push(win);
    return win;
  }

  /**
   * The handle `viewer` holds for `target`: the same object every time for a pair, as a WindowProxy is. Through the handle of a window
   * of the same origin, what that window has can be read (`window.opener.anything`); through one of another origin, which no opaque
   * origin is the same as, nothing but `closed` and `postMessage` can. A browser throws a SecurityError for the rest; here it reads as
   * not there, so that an assertion library that looks at a handle is not thrown by it, unless `throwOnCrossOrigin` is on, or a test
   * hands over a handle of its own that has the throw.
   */
  proxy(viewer: LabWindow, target: LabWindow): WindowHandle {
    let held = this.handles.get(viewer);
    if (held === undefined) this.handles.set(viewer, (held = new Map()));
    let handle = held.get(target);
    if (handle === undefined) {
      const own: WindowHandle = {
        get closed(): boolean {
          return target.closed;
        },
        target,
        postMessage: (data: unknown, targetOrigin?: string): void => {
          if (targetOrigin === undefined) throw new TypeError("Failed to execute 'postMessage' on 'Window': 2 arguments required, but only 1 present.");
          this.deliverMessage(viewer, target, data, targetOrigin);
        },
      };
      const sameOrigin = (): boolean => !viewer.opaque && !target.opaque && viewer.trueOrigin === target.trueOrigin;
      handle = new Proxy(own, {
        get: (handleOwn, key): unknown => {
          if (Reflect.has(handleOwn, key)) return Reflect.get(handleOwn, key) as unknown;
          if (sameOrigin()) return Reflect.get(target, key) as unknown;
          // as the platform does: a promise, a string conversion or an `instanceof` may look at any object, and none of them is refused
          if (this.throwOnCrossOrigin && typeof key === 'string' && key !== 'then') {
            throw new DOMException(`Blocked a frame with origin "${viewer.trueOrigin}" from accessing a cross-origin frame.`, 'SecurityError');
          }
          return undefined;
        },
      });
      held.set(target, handle);
    }
    return handle;
  }

  /** `opener` opens a window of its own origin: the handle `window.open` returns, and the new window's `window.opener` set. */
  popup(opener: LabWindow, name = 'speaker', options: LabWindowOptions = {}): { window: LabWindow; handle: WindowHandle } {
    const win = this.window(name, { origin: opener.opaque ? undefined : opener.origin, opaque: opener.opaque, file: opener.fileLike, ...options });
    win.opener = this.proxy(win, opener);
    return { window: win, handle: this.proxy(opener, win) };
  }

  /** A message that no window sent, as a forger's script would deliver it: `source` and `origin` are what the receiver is told. */
  inject(recipient: LabWindow, init: { data: unknown; origin?: string; source?: unknown }): void {
    recipient.dispatchEvent(Object.assign(new FakeEvent('message'), { data: init.data, origin: init.origin ?? recipient.trueOrigin, source: init.source ?? null }));
  }

  /** A `storage` event that no write of a window caused. */
  injectStorage(recipient: LabWindow, init: { key: string | null; newValue: string | null }): void {
    recipient.dispatchEvent(
      Object.assign(new FakeEvent('storage'), { key: init.key, oldValue: null, newValue: init.newValue, url: '', storageArea: recipient.storageObject }),
    );
  }

  deliverMessage(sender: LabWindow, recipient: LabWindow, data: unknown, targetOrigin: string): void {
    const clone = carried(data);
    if (!isTargetOrigin(targetOrigin)) {
      this.traffic.push({ via: 'postmessage', from: sender.name, to: recipient.name, data: clone, targetOrigin });
      throw new DOMException(`Invalid target origin '${targetOrigin}' in a call to 'postMessage'.`, 'SyntaxError');
    }
    this.traffic.push({ via: 'postmessage', from: sender.name, to: recipient.name, data: clone, targetOrigin });
    let matches: boolean;
    if (targetOrigin === '*') matches = true;
    else if (targetOrigin === '/') matches = !recipient.opaque && recipient.trueOrigin === sender.trueOrigin;
    else matches = !recipient.opaque && new URL(targetOrigin).origin === recipient.trueOrigin;
    if (!matches) return; // a browser drops it without a word
    queueMicrotask(() => {
      if (recipient.closed) return;
      recipient.dispatchEvent(
        Object.assign(new FakeEvent('message'), {
          data: carried(clone),
          origin: sender.opaque ? 'null' : sender.trueOrigin,
          source: this.proxy(recipient, sender),
        }),
      );
    });
  }

  // -- BroadcastChannel

  private channelKey(channel: LabChannel): string {
    return `${channel.owner.trueOrigin}::${channel.name}`;
  }

  join(channel: LabChannel): void {
    const key = this.channelKey(channel);
    const group = this.channels.get(key) ?? new Set<LabChannel>();
    group.add(channel);
    this.channels.set(key, group);
  }

  leave(channel: LabChannel): void {
    this.channels.get(this.channelKey(channel))?.delete(channel);
  }

  /** The page of `win` is gone without a word (see `LabWindow.unload`): its channels are closed and its listeners are gone. */
  unload(win: LabWindow): void {
    for (const group of this.channels.values()) for (const channel of [...group]) if (channel.owner === win) channel.close();
    win.removeAllListeners();
  }

  broadcast(from: LabChannel, data: unknown): void {
    const clone = carried(data);
    this.traffic.push({ via: 'broadcastchannel', from: from.owner.name, data: clone });
    for (const channel of [...(this.channels.get(this.channelKey(from)) ?? [])]) {
      if (channel === from) continue;
      queueMicrotask(() => channel.receive({ type: 'message', data: carried(clone) }));
    }
  }

  /** How many channels of this name are open, in every window: a test's proof that a cleanup closed them. */
  openChannels(name?: string): number {
    let total = 0;
    for (const [key, group] of this.channels) if (name === undefined || key.endsWith(`::${name}`)) total += group.size;
    return total;
  }

  // -- storage

  storeFor(win: LabWindow): Map<string, string> {
    let store = this.stores.get(win.trueOrigin);
    if (store === undefined) this.stores.set(win.trueOrigin, (store = new Map()));
    return store;
  }

  fireStorage(writer: LabWindow, key: string, oldValue: string | null, newValue: string | null): void {
    for (const other of this.windows) {
      if (other === writer || (other.opaque && !other.fileLike) || other.trueOrigin !== writer.trueOrigin || other.storageObject === undefined) continue;
      queueMicrotask(() => {
        if (other.closed) return;
        other.dispatchEvent(Object.assign(new FakeEvent('storage'), { key, oldValue, newValue, url: '', storageArea: other.storageObject }));
      });
    }
  }

  // -- reading the traffic

  /** The envelopes that went by on one transport, from one window if named. */
  sent(via: Via, from?: string): Array<Record<string, unknown>> {
    return this.traffic
      .filter((entry) => entry.via === via && (from === undefined || entry.from === from))
      .map((entry) => entry.data as Record<string, unknown>);
  }
}

/** Lets the turns of the laboratory go by: a message is delivered a turn after it is sent, and the reply a turn after that. */
export async function drain(turns = 24): Promise<void> {
  for (let turn = 0; turn < turns; turn += 1) await Promise.resolve();
}
