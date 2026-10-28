// Rigs for the speaker-surface tests (specs/005-teaching-spa.md 2.7, AC9 and AC10): a speaker window with the surface mounted on it, a
// presenter that answers it, and the shell itself (main.ts) booted in a window of the laboratory (helpers/sync-doubles.ts).
//
// Nothing here may import a module that names the DOM (the root tsconfig has no DOM lib), so main.ts is loaded through a variable
// specifier, as the other harnesses do.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { vi } from 'vitest';
import type { Announcer } from '../../../workshop/spa/src/shell/live-region';
import type { Presentation } from '../../../workshop/spa/src/shell/presentation';
import { mountSpeaker, type Speaker, type SpeakerSegment } from '../../../workshop/spa/src/shell/speaker';
import { createState, type ShellStore } from '../../../workshop/spa/src/shell/state';
import { createPresenterSync, parseSyncConfig, type PresenterSync, type SyncOptions, type SyncState } from '../../../workshop/spa/src/shell/sync';
import { FakeEvent, FakeMutationObserver, Keyboard, Pointer, type FakeElement } from './fake-dom';
import { ROOT, segmentsFromPipeline } from './interaction-harness';
import { installDoubles, type Doubles, type DoublesOptions } from './presentation-doubles';
import { Lab, drain, type LabWindow, type LabWindowOptions } from './sync-doubles';

export const INDEX_HTML = readFileSync(path.join(ROOT, 'workshop/spa/index.html'), 'utf8');

/** Lets every promise that was started run to the end: a message of the laboratory is a turn away, and its answer another. */
export async function settle(): Promise<void> {
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
}

/** The time as the segment timer shows it: whole minutes, two-digit seconds, a second that has begun counted as left. */
export function clockOf(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// -- a small deck of our own, so that what a test looks for is what the test put there --------------------------------------

export const DECK: readonly SpeakerSegment[] = [
  { id: 'alpha', title: 'Alpha segment', minutes: 10, scriptHtml: '<h2>Alpha script</h2><p>Say the alpha words.</p>' },
  { id: 'beta', title: 'Beta segment', minutes: 5, scriptHtml: '<h2>Beta script</h2><ul><li>First beta point</li><li>Second beta point</li></ul>' },
  { id: 'gamma', title: 'Gamma segment', minutes: 8 }, // no script at all: what the build gives a segment whose script file is missing is '', and a hand-made one may omit it
];

export const stateAt = (ids: readonly string[], index: number, more: Partial<SyncState> = {}): SyncState => ({
  segmentIndex: index,
  segmentId: ids[index],
  revealedSteps: 0,
  timer: null,
  ...more,
});

// -- a speaker window with the surface mounted on it ---------------------------------------------------------------------------

export interface SceneOptions {
  /** `location.search` of both windows: how the URL hooks reach them (a popup opened with '#/script' keeps the query of its opener). */
  search?: string;
  /** The index the presentation is at when the speaker opens, and what else it shows then (a reveal stage, a timer). */
  at?: number;
  state?: Partial<SyncState>;
  presenter?: LabWindowOptions;
  speaker?: LabWindowOptions;
  /** Options for the speaker's configuration, over the URL's. */
  options?: SyncOptions;
  /** Options for the presenter's configuration, where they differ from the speaker's. */
  presenterOptions?: SyncOptions;
  segments?: readonly SpeakerSegment[];
  /** `false`: nobody answers. */
  withPresenter?: boolean;
  /** `'blocked'`: the presenter was never given the window it opened. */
  popup?: 'held' | 'blocked';
}

export interface Announced {
  readonly message: string;
  readonly keep: boolean;
}

const scenes: Array<{ speaker: Speaker; presenter: PresenterSync | undefined }> = [];

export function scene(o: SceneOptions = {}) {
  const lab = new Lab();
  const presenterWin = lab.window('presenter', { search: o.search, ...o.presenter });
  const popup = lab.popup(presenterWin, 'speaker', { search: o.search, ...o.speaker });
  const segments = o.segments ?? DECK;
  const ids = segments.map((segment) => segment.id);
  const current = { value: stateAt(ids, o.at ?? 0, o.state) };
  const navigated: string[] = [];
  const presenter: PresenterSync | undefined =
    o.withPresenter === false
      ? undefined
      : createPresenterSync({
          window: presenterWin,
          config: parseSyncConfig(o.search, o.presenterOptions ?? o.options),
          snapshot: () => current.value,
          segmentIds: ids,
          navigate: (id) => void navigated.push(id),
          presenterId: 'P-1',
        });
  presenter?.setPopup(o.popup === 'blocked' ? null : popup.handle);

  const speakerWin = popup.window;
  speakerWin.document.open(INDEX_HTML);
  const store = createState(ids);
  const announced: Announced[] = [];
  const announce: Announcer = (message, options) => void announced.push({ message, keep: options?.keep === true });
  const speaker = mountSpeaker({ document: speakerWin.document, window: speakerWin, store, segments, announce, config: parseSyncConfig(o.search, o.options) });
  if (speaker === null) throw new Error('mountSpeaker mounted nothing on the shipped shell');

  const el = (id: string): FakeElement => {
    const found = speakerWin.document.getElementById(id);
    if (found === null) throw new Error(`#${id} is not on the speaker surface`);
    return found;
  };
  const made = {
    lab,
    presenterWin,
    speakerWin,
    handle: popup.handle,
    presenter,
    speaker,
    store,
    ids,
    segments,
    current,
    navigated,
    announced,
    el,
    root: (): FakeElement => el('speaker-script'),
    attr: (name: string): string | null => el('speaker-script').getAttribute(name),
    text: (id: string): string => el(id).textContent.trim(),
    /** The attribute AC9 is about. */
    index: (): string | null => el('speaker-script').getAttribute('data-segment-index'),
    /** What the presenter now shows, said to the speaker, and the laboratory let to run. */
    async show(next: SyncState): Promise<void> {
      current.value = next;
      presenter?.publish();
      await drain();
    },
  };
  scenes.push(made);
  return made;
}
export type Scene = ReturnType<typeof scene>;

/** What cleanup needs: no window, channel, listener or timer is left to the next test. */
export function disposeScenes(): void {
  for (const made of scenes.splice(0)) {
    made.speaker.dispose();
    made.presenter?.dispose();
  }
}

// -- main.ts booted in a window of the laboratory ----------------------------------------------------------------------------

/** What main.ts publishes next to the store. */
export interface TeachingSpaHandle {
  store: ShellStore;
  announce: Announcer;
  segments: ReadonlyArray<{ id: string; title: string; minutes: number; scriptHtml: string; html: string }>;
  presentation?: Presentation;
  sync?: PresenterSync;
  speaker?: Speaker;
}

export interface Shell {
  win: LabWindow;
  doubles: Doubles;
  spa: TeachingSpaHandle;
  liveRegion: FakeElement;
  pointer: Pointer;
  keyboard: Keyboard;
  ids: string[];
  el(id: string): FakeElement;
  press(id: string): void;
  check(id: string, checked?: boolean): void;
}

const shells: Shell[] = [];

/**
 * The shell, as the page boots it, in `win`. One shell to a process: main.ts reads the bare `window` and `document`, so a second
 * boot would take the globals from the first. A peer window runs the core, or `mountSpeaker`, which are handed their window.
 */
export async function bootShell(win: LabWindow, o: { hash?: string; doubles?: DoublesOptions } = {}): Promise<Shell> {
  vi.resetModules();
  win.document.open(INDEX_HTML);
  if (o.hash !== undefined && o.hash !== '') {
    win.location.hash = o.hash;
    await settle(); // the hashchange of this assignment belongs to nobody yet
  }
  const pointer = new Pointer(win.document);
  const keyboard = new Keyboard(win.document);
  const doubles = installDoubles({ window: win, document: win.document, keyboard, pointer, globals: {} }, o.doubles);
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', win.document);
  vi.stubGlobal('MutationObserver', FakeMutationObserver);
  vi.stubGlobal('navigator', doubles.navigator);
  vi.doMock('virtual:spa-content', () => ({ segments: segmentsFromPipeline() }));
  const specifier = '../../../workshop/spa/src/main';
  await import(specifier);
  await settle();
  const spa = win.teachingSpa as TeachingSpaHandle | undefined;
  const liveRegion = win.document.getElementById('live-region');
  if (spa === undefined || liveRegion === null) throw new Error('the shell did not publish window.teachingSpa or has no live region');
  const el = (id: string): FakeElement => {
    const found = win.document.getElementById(id);
    if (found === null) throw new Error(`#${id} is not in the shell`);
    return found;
  };
  const shell: Shell = {
    win,
    doubles,
    spa,
    liveRegion,
    pointer,
    keyboard,
    ids: spa.segments.map((segment) => segment.id),
    el,
    press: (id) => pointer.click(el(id)),
    check: (id, checked = true) => void Object.assign(el(id), { checked }),
  };
  shells.push(shell);
  return shell;
}

/** The page goes away: everything main.ts holds is let go, as `pagehide` makes it. */
export function leave(win: LabWindow): void {
  win.dispatchEvent(new FakeEvent('pagehide'));
}

export function leaveShells(): void {
  for (const shell of shells.splice(0)) leave(shell.win);
}
