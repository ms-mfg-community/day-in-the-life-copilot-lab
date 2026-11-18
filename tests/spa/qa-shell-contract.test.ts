// Additional SPA-03 error-path and boundary checks. Only owned fixtures are written.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { spaContentPlugin } from '../../workshop/spa/vite-content-plugin';
import { createAnnouncer } from '../../workshop/spa/src/shell/live-region';
import { hashFor, parseHash } from '../../workshop/spa/src/shell/router';
import { createState } from '../../workshop/spa/src/shell/state';

const ROOT = process.cwd();
const DECK = 'workshop/spa/content/deck.json';
const MODULE = '\0virtual:spa-content';
const fixtures: string[] = [];

afterEach(() => {
  while (fixtures.length) rmSync(fixtures.pop()!, { recursive: true, force: true });
});

function fixture(deck: string): string {
  const root = mkdtempSync(path.join(ROOT, 'tests/spa/.qa-shell-contract-'));
  fixtures.push(root);
  mkdirSync(path.join(root, 'workshop/spa/content'), { recursive: true });
  writeFileSync(path.join(root, DECK), deck, 'utf8');
  return root;
}

function invoke(root: string, watched: string[]) {
  const plugin = spaContentPlugin(root);
  const load = plugin.load as (
    this: { addWatchFile(file: string): void },
    id: string,
  ) => string | undefined;
  return load.call({ addWatchFile: (file) => watched.push(path.normalize(file)) }, MODULE);
}

describe('SPA-03 watch registration survives source errors', () => {
  it('watches the manifest even when its first parse fails, so repairing it can recover the dev server', () => {
    const root = fixture('{ not JSON');
    const watched: string[] = [];
    expect(() => invoke(root, watched)).toThrow();
    expect(watched).toContain(path.normalize(path.join(root, DECK)));

    writeFileSync(path.join(root, DECK), '{"segments":[]}', 'utf8');
    expect(invoke(root, [])).toBe('export const segments = [];');
  });

  it('watches every slide and script before attempting to render a missing first slide', () => {
    const segments = ['a', 'b'].map((id) => ({
      id,
      slideSource: `workshop/slides/${id}.md`,
      scriptSource: `workshop/speaker-scripts/${id}.md`,
      labRefs: [],
      minutes: 1,
    }));
    const root = fixture(JSON.stringify({ segments }));
    const watched: string[] = [];
    expect(() => invoke(root, watched)).toThrow(/ENOENT/);
    for (const rel of [DECK, ...segments.flatMap((s) => [s.slideSource, s.scriptSource])]) {
      expect(watched).toContain(path.normalize(path.join(root, rel)));
    }
  });
});

describe('SPA-03 router error boundaries', () => {
  it.each(['', '#', '#/'])('classifies %j as unknown when the deck has no first segment', (hash) => {
    expect(parseHash(hash, [])).toEqual({ kind: 'unknown', id: '' });
  });

  it('handles oversized and malformed hashes without throwing or matching a partial id', () => {
    for (const raw of ['%', '%FF', '%E0%A4%A', '%00', 'a'.repeat(65536)]) {
      expect(parseHash(`#/${raw}`, ['a']).kind).toBe('unknown');
    }
    const unicodeId = 'segment-\u{1f680}';
    expect(parseHash(hashFor(unicodeId), [unicodeId])).toEqual({ kind: 'segment', id: unicodeId });
  });
});

describe('SPA-03 store and announcement sibling callers', () => {
  it('retains previous parameter snapshots and delivers the correct previous/next states for a background update', () => {
    const store = createState(['a', 'b']);
    const before = store.get();
    const listener = vi.fn();
    store.subscribe(listener);
    store.update('b', (current) => ({ ...current, revealedSteps: 2, parameters: { budget: 42 } }));
    expect(store.get().currentId).toBe('a');
    expect(store.get().segments.b).toEqual({ revealedSteps: 2, parameters: { budget: 42 } });
    expect(before.segments.b).toEqual({ revealedSteps: 0, parameters: {} });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(store.get(), before);
    store.navigate('b');
    store.navigate('a');
    expect(store.get().segments.b.parameters).toEqual({ budget: 42 });
  });

  it('does not invoke an unknown-id updater, and a throwing updater leaves state and notifications unchanged', () => {
    const store = createState(['a', 'b']);
    const before = store.get();
    const listener = vi.fn();
    const unknownUpdater = vi.fn(() => ({ revealedSteps: 1, parameters: {} }));
    store.subscribe(listener);
    store.update('missing', unknownUpdater);
    expect(unknownUpdater).not.toHaveBeenCalled();
    expect(() =>
      store.update('a', () => {
        throw new Error('presenter input failed');
      }),
    ).toThrow('presenter input failed');
    expect(store.get()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it('ignores stale deferred callbacks even if they are invoked after the newest callback', () => {
    const region = { textContent: 'old' as string | null };
    const queue: Array<() => void> = [];
    const announce = createAnnouncer(region, (work) => queue.push(work));
    announce('older');
    announce('newest');
    queue[1]();
    expect(region.textContent).toBe('newest');
    queue[0]();
    expect(region.textContent).toBe('newest');
    announce('');
    queue[2]();
    queue[0]();
    expect(region.textContent).toBe('');
  });
});
