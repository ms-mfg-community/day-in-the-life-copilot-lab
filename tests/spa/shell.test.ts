import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAnnouncer } from '../../workshop/spa/src/shell/live-region.ts';
import { hashFor, parseHash } from '../../workshop/spa/src/shell/router.ts';
import { createState } from '../../workshop/spa/src/shell/state.ts';

const IDS = ['a', 'b', 'c'];

describe('router', () => {
  it('routes empty hash to the first segment', () => {
    expect(parseHash('', IDS)).toEqual({ kind: 'segment', id: 'a' });
    expect(parseHash('#/', IDS)).toEqual({ kind: 'segment', id: 'a' });
  });
  it('routes a known id and round-trips hashFor', () => {
    expect(parseHash(hashFor('b'), IDS)).toEqual({ kind: 'segment', id: 'b' });
  });
  it('treats content anchors as anchors, not routes', () => {
    expect(parseHash('#user-content-intro', IDS)).toEqual({ kind: 'anchor' });
  });
  it('flags unknown and malformed ids, including prototype names', () => {
    expect(parseHash('#/nope', IDS)).toEqual({ kind: 'unknown', id: 'nope' });
    expect(parseHash('#/%E0%A4%A', IDS).kind).toBe('unknown');
    expect(parseHash('#/constructor', IDS).kind).toBe('unknown');
  });
});

describe('state', () => {
  it('keeps segment state across navigation and never mutates handed-out values', () => {
    const store = createState(IDS);
    const before = store.get();
    store.update('a', (s) => ({ ...s, revealedSteps: 2 }));
    store.navigate('b');
    store.navigate('a');
    expect(store.get().segments.a.revealedSteps).toBe(2);
    expect(before.segments.a.revealedSteps).toBe(0);
  });
  it('ignores unknown ids and notifies subscribers once per change', () => {
    const store = createState(IDS);
    const seen: string[] = [];
    const off = store.subscribe((next) => seen.push(next.currentId));
    store.navigate('zzz');
    store.navigate('toString');
    store.navigate('c');
    store.navigate('c');
    off();
    store.navigate('a');
    expect(seen).toEqual(['c']);
  });
});

describe('live region', () => {
  it('clears then writes, so repeated messages are re-announced', () => {
    const region = { textContent: 'old' as string | null };
    const queue: Array<() => void> = [];
    const announce = createAnnouncer(region, (work) => queue.push(work));
    announce('hello');
    expect(region.textContent).toBe('');
    queue.shift()!();
    expect(region.textContent).toBe('hello');
  });
});

describe('spa:build (AC4)', () => {
  it('exits 0 and writes dist/index.html carrying every manifest segment', () => {
    execFileSync('npm', ['run', 'spa:build'], { shell: true, stdio: 'pipe' });
    const dist = path.resolve('workshop/spa/dist');
    expect(existsSync(path.join(dist, 'index.html'))).toBe(true);
    const assets = readdirSync(path.join(dist, 'assets')).filter((f) => f.endsWith('.js'));
    const bundle = assets.map((f) => readFileSync(path.join(dist, 'assets', f), 'utf8')).join('');
    const deck = JSON.parse(readFileSync('workshop/spa/content/deck.json', 'utf8'));
    for (const segment of deck.segments) expect(bundle).toContain(segment.id);
    expect(bundle).toContain('user-content-');
  }, 120000);
});
