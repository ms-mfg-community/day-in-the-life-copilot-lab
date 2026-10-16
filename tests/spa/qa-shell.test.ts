// Independent QA suite for SPA-03 — Application shell and the multi-file build (AC4).
// Tests titled "QA defect (S1/S2)" pin the findings from the first QA pass. They were written red and now guard the
// fixes, so every test here runs unconditionally.

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAnnouncer } from '../../workshop/spa/src/shell/live-region';
import { hashFor, parseHash } from '../../workshop/spa/src/shell/router';
import { createState } from '../../workshop/spa/src/shell/state';
import { ac3Violations, headingIds } from './helpers/html-scan';

const ROOT = process.cwd();

interface LoadedSegment {
  id: string;
  minutes: number;
  labRefs: string[];
  scriptSource: string;
  title: string;
  html: string;
}

interface ContentPluginModule {
  loadSegments(repoRoot: string): LoadedSegment[];
  spaContentPlugin(repoRoot: string): {
    name: string;
    resolveId?: (id: string) => string | undefined;
    load?: (this: { addWatchFile(id: string): void }, id: string) => string | undefined;
  };
}

const pluginSpecifier = '../../workshop/spa/vite-content-plugin';
async function importContentPlugin(): Promise<ContentPluginModule> {
  return (await import(pluginSpecifier)) as ContentPluginModule;
}

interface FakeElement {
  tagName: string;
  id: string;
  href: string;
  textContent: string | null;
  innerHTML: string;
  attributes: Map<string, string>;
  children: FakeElement[];
  scrollIntoView: ReturnType<typeof vi.fn>;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  replaceChildren(...nodes: FakeElement[]): void;
  closest(selector: string): FakeElement | null;
}

function makeElement(tagName: string, id = ''): FakeElement {
  const attributes = new Map<string, string>();
  if (id) attributes.set('id', id);
  const el: FakeElement = {
    tagName: tagName.toLowerCase(),
    id,
    href: '',
    textContent: '',
    innerHTML: '',
    attributes,
    children: [],
    scrollIntoView: vi.fn(),
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
      if (name === 'id') el.id = value;
      if (name === 'href') el.href = value;
    },
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    },
    replaceChildren(...nodes: FakeElement[]) {
      el.children = [...nodes];
    },
    closest(selector: string) {
      if (selector === 'a[href]' && el.tagName === 'a' && el.href !== '') return el;
      return null;
    },
  };
  return el;
}

function setupShellDom(initialHash = '') {
  const nav = makeElement('nav', 'segment-nav');
  const main = makeElement('main', 'main');
  const liveRegion = makeElement('div', 'live-region');
  const dynamicById = new Map<string, FakeElement>();
  const hashListeners = new Set<() => void>();
  const clickListeners = new Set<(event: { target: unknown; defaultPrevented: boolean }) => void>();

  // Track innerHTML assignments on child divs inside <main> so getElementById finds rendered heading ids.
  const createElement = vi.fn((tagName: string) => {
    const el = makeElement(tagName);
    let rawHtml = '';
    Object.defineProperty(el, 'innerHTML', {
      get: () => rawHtml,
      set: (value: string) => {
        rawHtml = value;
        for (const id of headingIds(value)) {
          if (id && !dynamicById.has(id)) {
            dynamicById.set(id, makeElement('h2', id));
          }
        }
      },
    });
    return el;
  });

  const mainReplace = main.replaceChildren.bind(main);
  const renderHistory: string[] = [];
  main.replaceChildren = (...nodes: FakeElement[]) => {
    dynamicById.clear();
    for (const node of nodes) {
      if (node.innerHTML) {
        for (const id of headingIds(node.innerHTML)) {
          if (id) dynamicById.set(id, makeElement('h2', id));
        }
      }
    }
    if (nodes[0]?.textContent) renderHistory.push(nodes[0].textContent);
    mainReplace(...nodes);
  };

  let currentHash = initialHash;
  const location = {
    get hash() {
      return currentHash;
    },
    set hash(next: string) {
      currentHash = next === '' || next.startsWith('#') ? next : `#${next}`;
    },
    get href() {
      return `https://spa.test/${currentHash}`;
    },
  };

  const win = {
    location,
    teachingSpa: undefined as
      | undefined
      | {
          store: ReturnType<typeof createState>;
          announce: (message: string) => void;
          segments: ReadonlyArray<LoadedSegment>;
        },
    addEventListener: vi.fn((type: string, listener: () => void) => {
      if (type === 'hashchange') hashListeners.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: () => void) => {
      if (type === 'hashchange') hashListeners.delete(listener);
    }),
  };

  const doc = {
    title: 'Teaching SPA',
    getElementById: vi.fn((id: string) => {
      if (id === 'segment-nav') return nav;
      if (id === 'main') return main;
      if (id === 'live-region') return liveRegion;
      return dynamicById.get(id) ?? null;
    }),
    getElementsByName: vi.fn(() => []),
    querySelectorAll: vi.fn(() => []),
    createElement,
    addEventListener: vi.fn((type: string, listener: (event: { target: unknown; defaultPrevented: boolean }) => void) => {
      if (type === 'click') clickListeners.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: (event: { target: unknown; defaultPrevented: boolean }) => void) => {
      if (type === 'click') clickListeners.delete(listener);
    }),
  };

  function navigateToHash(newHash: string): void {
    const normalized = newHash === '' || newHash.startsWith('#') ? newHash : `#${newHash}`;
    if (normalized === currentHash) return; // Real browsers do not fire hashchange when hash is unchanged.
    currentHash = normalized;
    for (const listener of [...hashListeners]) listener();
  }

  function clickNavLink(segmentId: string): void {
    const link = nav.children.find((child) => child.href === hashFor(segmentId));
    if (!link) throw new Error(`nav link not found for ${segmentId}`);
    // Real browser anchor click: updates location.hash and fires hashchange only if the hash changed.
    navigateToHash(link.href);
  }

  return {
    win,
    doc,
    nav,
    main,
    liveRegion,
    dynamicById,
    renderHistory,
    hashListeners,
    clickListeners,
    navigateToHash,
    clickNavLink,
  };
}

describe('QA vite-content-plugin and loadSegments', () => {
  const scratchDirs: string[] = [];
  afterEach(() => {
    while (scratchDirs.length > 0) {
      rmSync(scratchDirs.pop()!, { recursive: true, force: true });
    }
  });

  function makeRepoFixture(segments: Array<{ id: string; slideMarkdown: string; minutes?: number }>): string {
    const dir = mkdtempSync(path.join(ROOT, 'tests/spa/.qa-plugin-'));
    scratchDirs.push(dir);
    mkdirSync(path.join(dir, 'workshop/spa/content'), { recursive: true });
    mkdirSync(path.join(dir, 'workshop/slides'), { recursive: true });
    mkdirSync(path.join(dir, 'workshop/speaker-scripts'), { recursive: true });
    const deckSegments = segments.map((s, idx) => {
      const slideRel = `workshop/slides/${idx}-${s.id}.md`;
      const scriptRel = `workshop/speaker-scripts/${idx}-${s.id}.md`;
      writeFileSync(path.join(dir, slideRel), s.slideMarkdown, 'utf8');
      writeFileSync(path.join(dir, scriptRel), '# Script\n', 'utf8');
      return {
        id: s.id,
        slideSource: slideRel,
        scriptSource: scriptRel,
        labRefs: ['labs/lab01.md'],
        minutes: s.minutes ?? 15,
      };
    });
    writeFileSync(
      path.join(dir, 'workshop/spa/content/deck.json'),
      JSON.stringify({ segments: deckSegments }, null, 2),
      'utf8',
    );
    return dir;
  }

  it('loads every real curriculum segment in manifest order with sanitized HTML and front-matter titles', async () => {
    const { loadSegments } = await importContentPlugin();
    const deck = JSON.parse(readFileSync(path.join(ROOT, 'workshop/spa/content/deck.json'), 'utf8')) as {
      segments: Array<{ id: string; slideSource: string; scriptSource: string; labRefs: string[]; minutes: number }>;
    };
    const loaded = loadSegments(ROOT);

    expect(loaded.map((s) => s.id)).toEqual(deck.segments.map((s) => s.id));
    for (let i = 0; i < loaded.length; i += 1) {
      const seg = loaded[i];
      const manifest = deck.segments[i];
      expect(seg.minutes).toBe(manifest.minutes);
      expect(seg.labRefs).toEqual(manifest.labRefs);
      expect(seg.scriptSource).toBe(manifest.scriptSource);
      expect(seg.title.trim().length).toBeGreaterThan(0);
      expect(seg.title).not.toBe(seg.id); // every real slide has a human title in front matter
      expect(ac3Violations(seg.html)).toEqual([]);
      expect(headingIds(seg.html).length).toBeGreaterThan(0);
      expect(seg.html).not.toContain('anchor_labs:');
    }
  });

  it('falls back to segment.id when front-matter title is missing, blank, or non-string', async () => {
    const { loadSegments } = await importContentPlugin();
    const fixture = makeRepoFixture([
      { id: 'no-frontmatter', slideMarkdown: '# Heading only\n' },
      { id: 'empty-title', slideMarkdown: '---\ntitle: ""\n---\n# Body\n' },
      { id: 'whitespace-title', slideMarkdown: '---\ntitle: "   \\t "\n---\n# Body\n' },
      { id: 'numeric-title', slideMarkdown: '---\ntitle: 12345\n---\n# Body\n' },
      { id: 'array-title', slideMarkdown: '---\ntitle: [a, b]\n---\n# Body\n' },
      { id: 'valid-title', slideMarkdown: '---\ntitle: "Explicit Title"\n---\n# Body\n' },
    ]);

    const loaded = loadSegments(fixture);
    expect(loaded.map((s) => ({ id: s.id, title: s.title }))).toEqual([
      { id: 'no-frontmatter', title: 'no-frontmatter' },
      { id: 'empty-title', title: 'empty-title' },
      { id: 'whitespace-title', title: 'whitespace-title' },
      { id: 'numeric-title', title: 'numeric-title' },
      { id: 'array-title', title: 'array-title' },
      { id: 'valid-title', title: 'Explicit Title' },
    ]);
  });

  it('resolves only virtual:spa-content and ignores unrelated module IDs', async () => {
    const { spaContentPlugin } = await importContentPlugin();
    const plugin = spaContentPlugin(ROOT);
    expect(plugin.name).toBe('spa-content');
    expect(plugin.resolveId?.('virtual:spa-content')).toBe('\0virtual:spa-content');
    expect(plugin.resolveId?.('virtual:other')).toBeUndefined();
    expect(plugin.resolveId?.('./src/main.ts')).toBeUndefined();

    const watched: string[] = [];
    const ctx = { addWatchFile: (file: string) => watched.push(file) };
    expect(plugin.load?.call(ctx, 'virtual:spa-content')).toBeUndefined();
    expect(watched).toEqual([]);

    const code = plugin.load?.call(ctx, '\0virtual:spa-content');
    expect(code).toMatch(/^export const segments = \[/);
  });

  it('QA defect (S1): spaContentPlugin watches deck.json and each segment slideSource (not only scriptSource)', async () => {
    const { spaContentPlugin } = await importContentPlugin();
    const fixture = makeRepoFixture([
      { id: 'seg-1', slideMarkdown: '---\ntitle: One\n---\n# One\n' },
      { id: 'seg-2', slideMarkdown: '---\ntitle: Two\n---\n# Two\n' },
    ]);
    const plugin = spaContentPlugin(fixture);
    const watched: string[] = [];
    plugin.load?.call({ addWatchFile: (file: string) => watched.push(path.normalize(file)) }, '\0virtual:spa-content');

    expect(watched).toContain(path.normalize(path.join(fixture, 'workshop/spa/content/deck.json')));
    expect(watched).toContain(path.normalize(path.join(fixture, 'workshop/slides/0-seg-1.md')));
    expect(watched).toContain(path.normalize(path.join(fixture, 'workshop/slides/1-seg-2.md')));

    // Even when deck.json has 0 segments, deck.json itself must be watched so adding a segment triggers rebuild.
    const emptyFixture = makeRepoFixture([]);
    const emptyWatched: string[] = [];
    spaContentPlugin(emptyFixture).load?.call(
      { addWatchFile: (file: string) => emptyWatched.push(path.normalize(file)) },
      '\0virtual:spa-content',
    );
    expect(emptyWatched).toContain(path.normalize(path.join(emptyFixture, 'workshop/spa/content/deck.json')));
  });
});

describe('QA router boundary and hostile inputs', () => {
  const IDS = ['m1-extensibility-architecture', 'm2-mcp', 'seg/with spaces & ?#'];

  it('routes empty hash, bare #, and #/ to the first segment', () => {
    expect(parseHash('', IDS)).toEqual({ kind: 'segment', id: IDS[0] });
    expect(parseHash('#', IDS)).toEqual({ kind: 'segment', id: IDS[0] });
    expect(parseHash('#/', IDS)).toEqual({ kind: 'segment', id: IDS[0] });
  });

  it('round-trips segment IDs requiring URI encoding and decodes percent-encoded routes once', () => {
    const encoded = hashFor('seg/with spaces & ?#');
    expect(encoded).toBe('#/seg%2Fwith%20spaces%20%26%20%3F%23');
    expect(parseHash(encoded, IDS)).toEqual({ kind: 'segment', id: 'seg/with spaces & ?#' });
    expect(parseHash('#/m2%2Dmcp', IDS)).toEqual({ kind: 'segment', id: 'm2-mcp' });
    expect(parseHash('#/m2%252Dmcp', IDS)).toEqual({ kind: 'unknown', id: 'm2%2Dmcp' });
  });

  it('distinguishes in-page anchors (#main, #heading) from unknown segment routes (#/unknown)', () => {
    expect(parseHash('#main', IDS)).toEqual({ kind: 'anchor' });
    expect(parseHash('#the-advanced-problem', IDS)).toEqual({ kind: 'anchor' });
    expect(parseHash('#user-content-the-advanced-problem', IDS)).toEqual({ kind: 'anchor' });
    expect(parseHash('#/main', IDS)).toEqual({ kind: 'unknown', id: 'main' });
    expect(parseHash('#//', IDS)).toEqual({ kind: 'unknown', id: '/' });
  });

  it('rejects Object.prototype property names as unknown routes', () => {
    for (const protoKey of ['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty']) {
      expect(parseHash(`#/${protoKey}`, IDS)).toEqual({ kind: 'unknown', id: protoKey });
    }
  });

  it('QA defect (S2): parseHash on an empty segment list does not return kind=segment with id=undefined', () => {
    const result = parseHash('', []);
    if (result.kind === 'segment') {
      expect(typeof result.id).toBe('string');
    } else {
      expect(result.kind).not.toBe('segment');
    }
  });
});

describe('QA state store isolation and subscriber contract', () => {
  const IDS = ['a', 'b', 'c'];

  it('preserves independent revealedSteps and parameters across segments and ignores prototype keys', () => {
    const store = createState(IDS);
    store.update('a', (s) => ({ ...s, revealedSteps: 3, parameters: { model: 'sonnet' } }));
    store.update('b', (s) => ({ ...s, revealedSteps: 1, parameters: { tokens: 4000 } }));

    const bogusEvents: string[] = [];
    store.subscribe((next) => bogusEvents.push(next.currentId));
    store.update('__proto__', () => ({ revealedSteps: 99, parameters: {} }));
    store.update('constructor', () => ({ revealedSteps: 99, parameters: {} }));
    store.navigate('constructor');
    store.navigate('__proto__');
    expect(bogusEvents).toEqual([]);
    expect(Object.keys(store.get().segments)).toEqual(['a', 'b', 'c']);

    store.navigate('b');
    expect(store.get().currentId).toBe('b');
    expect(store.get().segments.a).toEqual({ revealedSteps: 3, parameters: { model: 'sonnet' } });
    expect(store.get().segments.b).toEqual({ revealedSteps: 1, parameters: { tokens: 4000 } });
    expect(store.get().segments.c).toEqual({ revealedSteps: 0, parameters: {} });
  });

  it('QA defect (S2): initial segment states do not share a single mutable parameters object across segments or stores', () => {
    const firstStore = createState(['a', 'b']);
    const secondStore = createState(['x']);

    (firstStore.get().segments.a.parameters as Record<string, unknown>).leaked = 'mutated';
    expect(firstStore.get().segments.b.parameters).toEqual({});
    expect(secondStore.get().segments.x.parameters).toEqual({});
  });

  it('QA defect (S2): a no-op update returning the identical SegmentState does not notify subscribers', () => {
    const store = createState(IDS);
    const calls: number[] = [];
    store.subscribe(() => calls.push(1));

    store.update('a', (current) => current);
    expect(calls).toEqual([]);
  });
});

describe('QA live-region announcer timing and rapid calls', () => {
  it('clears synchronously and writes only when the deferred callback runs', () => {
    const region = { textContent: 'initial' as string | null };
    const pending: Array<() => void> = [];
    const announce = createAnnouncer(region, (work) => pending.push(work));

    announce('Segment 1 of 8');
    expect(region.textContent).toBe('');
    expect(pending).toHaveLength(1);

    pending[0]();
    expect(region.textContent).toBe('Segment 1 of 8');
  });

  it('QA defect (S2): back-to-back announce calls within the defer window cancel the stale timer', () => {
    vi.useFakeTimers();
    try {
      const region = { textContent: 'initial' as string | null };
      const announce = createAnnouncer(region);

      announce('Same alert');
      vi.advanceTimersByTime(20);
      announce('Same alert');

      // At 50ms, the superseded first call must NOT write 'Same alert' early and prevent the 70ms write from transitioning from ''.
      vi.advanceTimersByTime(30);
      expect(region.textContent).toBe('');

      vi.advanceTimersByTime(20);
      expect(region.textContent).toBe('Same alert');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('QA shell runtime (main.ts)', () => {
  const sampleSegments: LoadedSegment[] = [
    {
      id: 'm1-extensibility-architecture',
      minutes: 35,
      labRefs: ['labs/lab01.md'],
      scriptSource: 'workshop/speaker-scripts/module-01-extensibility-architecture.md',
      title: 'Copilot CLI extensibility architecture',
      html: '<h1 id="user-content-m1">M1</h1><h2 id="user-content-the-advanced-problem">The advanced problem</h2>',
    },
    {
      id: 'm2-mcp',
      minutes: 30,
      labRefs: ['labs/lab05.md'],
      scriptSource: 'workshop/speaker-scripts/module-02-mcp.md',
      title: 'MCP servers in anger',
      html: '<h1 id="user-content-m2">M2</h1><h2 id="user-content-three-layers">Three layers</h2>',
    },
    {
      id: 'm3-hostile-title',
      minutes: 10,
      labRefs: ['labs/lab07.md'],
      scriptSource: 'workshop/speaker-scripts/module-03-multi-agent.md',
      title: '<img src=x onerror=alert(1)>',
      html: '<h1 id="user-content-m3">M3</h1>',
    },
  ];

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  async function bootMain(initialHash = '', customSegments: LoadedSegment[] = sampleSegments) {
    vi.resetModules();
    const dom = setupShellDom(initialHash);
    vi.stubGlobal('window', dom.win);
    vi.stubGlobal('document', dom.doc);
    vi.doMock('virtual:spa-content', () => ({ segments: customSegments }));
    const mainSpecifier = '../../workshop/spa/src/main';
    await import(mainSpecifier);
    return dom;
  }

  it('renders nav links, main heading/body, aria-current="page", document.title, and window.teachingSpa on boot', async () => {
    const dom = await bootMain('');

    expect(dom.win.teachingSpa).toBeDefined();
    expect(dom.win.teachingSpa?.store.get().currentId).toBe('m1-extensibility-architecture');
    expect(dom.nav.children).toHaveLength(3);
    expect(dom.nav.children[0].href).toBe('#/m1-extensibility-architecture');
    expect(dom.nav.children[0].textContent).toBe('Copilot CLI extensibility architecture');
    expect(dom.nav.children[0].getAttribute('aria-current')).toBe('page');
    expect(dom.nav.children[1].getAttribute('aria-current')).toBeNull();
    expect(dom.main.children[0].tagName).toBe('h1');
    expect(dom.main.children[0].textContent).toBe('Copilot CLI extensibility architecture');
    expect(dom.main.children[1].innerHTML).toContain('user-content-the-advanced-problem');
    expect(dom.doc.title).toBe('Copilot CLI extensibility architecture — Teaching SPA');
  });

  it('renders hostile front-matter title via textContent (never innerHTML) in both nav and main h1', async () => {
    const dom = await bootMain('#/m3-hostile-title');

    expect(dom.nav.children[2].textContent).toBe('<img src=x onerror=alert(1)>');
    expect(dom.nav.children[2].innerHTML).toBe('');
    expect(dom.main.children[0].textContent).toBe('<img src=x onerror=alert(1)>');
    expect(dom.main.children[0].innerHTML).toBe('');
  });

  it('navigates on hashchange to a valid segment, updates aria-current and document.title, and announces in live-region', async () => {
    vi.useFakeTimers();
    try {
      const dom = await bootMain('');
      dom.navigateToHash('#/m2-mcp');

      expect(dom.win.teachingSpa?.store.get().currentId).toBe('m2-mcp');
      expect(dom.nav.children[0].getAttribute('aria-current')).toBeNull();
      expect(dom.nav.children[1].getAttribute('aria-current')).toBe('page');
      expect(dom.main.children[0].textContent).toBe('MCP servers in anger');
      expect(dom.doc.title).toBe('MCP servers in anger — Teaching SPA');

      vi.advanceTimersByTime(60);
      expect(dom.liveRegion.textContent).toBe('Segment 2 of 3: MCP servers in anger');
    } finally {
      vi.useRealTimers();
    }
  });

  it('recovers from an unknown segment hash by restoring the active segment hash and announcing the error', async () => {
    vi.useFakeTimers();
    try {
      const dom = await bootMain('');
      dom.navigateToHash('#/m2-mcp');
      vi.advanceTimersByTime(60);

      dom.navigateToHash('#/does-not-exist');
      expect(dom.win.teachingSpa?.store.get().currentId).toBe('m2-mcp');
      expect(dom.win.location.hash).toBe('#/m2-mcp');

      vi.advanceTimersByTime(60);
      expect(dom.liveRegion.textContent).toBe('Unknown segment "does-not-exist"');
    } finally {
      vi.useRealTimers();
    }
  });

  it('scrolls to a user-content- heading on hashchange to an in-page anchor without losing the active segment', async () => {
    vi.useFakeTimers();
    try {
      const dom = await bootMain('');
      dom.navigateToHash('#/m2-mcp');
      vi.advanceTimersByTime(60);

      dom.navigateToHash('#three-layers');
      vi.advanceTimersByTime(10);

      expect(dom.win.teachingSpa?.store.get().currentId).toBe('m2-mcp');
      const target = dom.dynamicById.get('user-content-three-layers');
      expect(target).toBeDefined();
      expect(target?.scrollIntoView).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('QA defect (S1): booting with an initial in-page anchor hash (#the-advanced-problem) scrolls the prefixed heading into view', async () => {
    vi.useFakeTimers();
    try {
      const dom = await bootMain('#the-advanced-problem');
      vi.advanceTimersByTime(10);

      const target = dom.dynamicById.get('user-content-the-advanced-problem');
      expect(target).toBeDefined();
      expect(target?.scrollIntoView).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('QA defect (S1): programmatic store.navigate updates location.hash so clicking the prior nav link works', async () => {
    const dom = await bootMain('#/m1-extensibility-architecture');

    // Advance programmatically through the documented extension point.
    dom.win.teachingSpa?.store.navigate('m2-mcp');
    expect(dom.win.teachingSpa?.store.get().currentId).toBe('m2-mcp');
    expect(dom.win.location.hash).toBe('#/m2-mcp');

    // Now click the nav link for segment 1; the browser only fires hashchange if location.hash differs from the link href.
    dom.clickNavLink('m1-extensibility-architecture');
    expect(dom.win.teachingSpa?.store.get().currentId).toBe('m1-extensibility-architecture');
  });

  it('QA defect (S2): booting directly on a non-first segment (#/m2-mcp) renders once and does not emit a transition announcement', async () => {
    vi.useFakeTimers();
    try {
      const dom = await bootMain('#/m2-mcp');
      vi.advanceTimersByTime(60);

      expect(dom.renderHistory).toEqual(['MCP servers in anger']);
      expect(dom.liveRegion.textContent).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('executes the built dist/assets/*.js bundle and verifies dist/index.html structure and relative base (AC4, §2.9)', async () => {
    const distDir = path.join(ROOT, 'workshop/spa/dist');
    const viteBin = path.join(ROOT, 'node_modules/vite/bin/vite.js');
    if (!existsSync(path.join(distDir, 'index.html'))) {
      const buildRes = spawnSync(process.execPath, [viteBin, 'build', '--config', 'workshop/spa/vite.config.ts'], {
        cwd: ROOT,
        encoding: 'utf8',
      });
      expect(buildRes.status, buildRes.stdout + buildRes.stderr).toBe(0);
    }

    const indexHtml = readFileSync(path.join(distDir, 'index.html'), 'utf8');
    expect(indexHtml).toMatch(/<a\s+[^>]*href="#main"[^>]*data-skip[^>]*>/);
    expect(indexHtml).toMatch(/<nav\s+[^>]*id="segment-nav"[^>]*aria-label="Segments"[^>]*>/);
    expect(indexHtml).toMatch(/<main\s+[^>]*id="main"[^>]*tabindex="-1"[^>]*>/);
    expect(indexHtml).toMatch(
      /<div\s+[^>]*id="live-region"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"[^>]*>/,
    );
    expect(indexHtml).toMatch(/<script\s+type="module"\s+crossorigin\s+src="\.\/assets\/[^"]+\.js"><\/script>/);

    const jsFiles = readdirSync(path.join(distDir, 'assets')).filter((f) => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);

    const dom = setupShellDom('');
    vi.stubGlobal('window', dom.win);
    vi.stubGlobal('document', dom.doc);
    vi.stubGlobal(
      'MutationObserver',
      class {
        observe(): void {}
      },
    );
    const bundleUrl = `${pathToFileURL(path.join(distDir, 'assets', jsFiles[0])).href}?t=${Date.now()}`;
    await import(bundleUrl);

    const deck = JSON.parse(readFileSync(path.join(ROOT, 'workshop/spa/content/deck.json'), 'utf8')) as {
      segments: Array<{ id: string }>;
    };
    expect(dom.nav.children).toHaveLength(deck.segments.length);
    expect(dom.win.teachingSpa?.segments).toHaveLength(deck.segments.length);
    expect(dom.win.teachingSpa?.store.get().currentId).toBe(deck.segments[0].id);
    expect(dom.nav.children[0].getAttribute('aria-current')).toBe('page');

    dom.navigateToHash(`#/${deck.segments[1].id}`);
    expect(dom.win.teachingSpa?.store.get().currentId).toBe(deck.segments[1].id);
    expect(dom.nav.children[1].getAttribute('aria-current')).toBe('page');
  });
});

describe('QA TypeScript check (tsconfig.json)', () => {
  it('QA defect (S2): npx tsc --noEmit passes with zero TS5097 errors on shell test and SPA files', () => {
    const tscBin = path.join(ROOT, 'node_modules/typescript/bin/tsc');
    const result = spawnSync(
      process.execPath,
      [
        tscBin,
        '--noEmit',
        '--target',
        'ES2022',
        '--module',
        'ESNext',
        '--moduleResolution',
        'Bundler',
        '--strict',
        '--esModuleInterop',
        '--skipLibCheck',
        '--resolveJsonModule',
        '--types',
        'node',
        'tests/spa/shell.test.ts',
        'workshop/spa/src/main.ts',
        'workshop/spa/src/virtual-content.d.ts',
        'workshop/spa/vite-content-plugin.ts',
        'workshop/spa/vite.config.ts',
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
  });
});
