// Independent SPA-03 re-review: exercise the new renderer seam and real Vite recovery with a single repair.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer, type ViteDevServer } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';
import { createRenderer, renderMarkdown } from '../../workshop/spa/src/content/markdown';
import { rewriteSlideLinks } from '../../workshop/spa/src/content/slide-links';
import { loadSegments, spaContentPlugin } from '../../workshop/spa/vite-content-plugin';
import { ac3Violations, attributeValues, headingIds } from './helpers/html-scan';

const DECK = 'workshop/spa/content/deck.json';
const SLIDE = 'workshop/slides/a.md';
const VIRTUAL_ID = '\0virtual:spa-content';
const RELOAD = { type: 'full-reload', path: '*' };
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

function fixture(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'spa-qa-r2-'));
  roots.push(root);
  write(root, DECK, JSON.stringify({
    segments: [{
      id: 'a', slideSource: SLIDE, scriptSource: 'workshop/speaker-scripts/a.md', labRefs: [], minutes: 1,
    }],
  }));
  write(root, SLIDE, '---\ntitle: A\n---\n# A\n');
  write(root, 'workshop/speaker-scripts/a.md', '# Script\n');
  write(root, 'workshop/spa/main.js', "import { segments } from 'virtual:spa-content';\nexport default segments;\n");
  return root;
}

function write(root: string, relative: string, contents: string): void {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents, 'utf8');
}

async function serverFor(root: string): Promise<{ server: ViteDevServer; sent: unknown[] }> {
  const server = await createServer({
    root: path.join(root, 'workshop/spa'),
    configFile: false,
    logLevel: 'silent',
    plugins: [spaContentPlugin(root)],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, ws: false },
  });
  const sent: unknown[] = [];
  const hot = server.hot as unknown as { send: (...args: unknown[]) => void };
  const originalSend = hot.send.bind(hot);
  hot.send = (...args) => {
    sent.push(args.length === 1 ? args[0] : args);
    originalSend(...args);
  };
  await server.transformRequest('/main.js');
  return { server, sent };
}

async function watched(server: ViteDevServer, root: string, relative: string): Promise<void> {
  const file = path.join(root, relative);
  // Wait for the actual filesystem watch, not a delay guessed to be long enough. The repair below is written once.
  await expect.poll(() => server.watcher.getWatched()[path.dirname(file)] ?? [], { timeout: 10_000 })
    .toContain(path.basename(file));
}

describe('SPA-03 r2 renderer seam', () => {
  it('preserves front-matter data and the default renderer contract without enabling raw HTML', () => {
    const raw = '---\ntitle: "<b>not markup</b>"\nminutes: 7\n---\n# Heading\n\n<script>unused()</script>\n';
    const rendered = createRenderer()(raw);
    expect(rendered).toEqual(renderMarkdown(raw));
    expect(rendered.data).toEqual({ title: '<b>not markup</b>', minutes: 7 });
    expect(rendered.html).toContain('id="user-content-heading"');
    expect(ac3Violations(rendered.html)).toEqual([]);
    expect(rendered.html).not.toContain('unused()');
  });

  it('forwards both plugin kinds while sanitizing hostile nodes introduced through the new API', () => {
    const remarkExtra = () => (tree: unknown) => {
      (tree as { children: unknown[] }).children.push({
        type: 'paragraph', children: [{ type: 'text', value: 'remark effect' }],
      });
    };
    const rehypeExtra = () => (tree: unknown) => {
      (tree as { children: unknown[] }).children.push(
        { type: 'element', tagName: 'script', properties: {}, children: [{ type: 'text', value: 'bad()' }] },
        {
          type: 'element', tagName: 'h2', properties: { id: 'cookie', onClick: 'bad()' },
          children: [{ type: 'text', value: 'rehype effect' }],
        },
        {
          type: 'element', tagName: 'a', properties: { href: 'javascript:bad()', onClick: 'bad()' },
          children: [{ type: 'text', value: 'unsafe link' }],
        },
      );
    };
    const rendered = createRenderer({
      extraRemarkPlugins: [remarkExtra],
      extraRehypePlugins: [rehypeExtra],
    })('---\ntitle: Safe\n---\n# Heading\n');
    expect(rendered.data).toEqual({ title: 'Safe' });
    expect(rendered.html).toContain('remark effect');
    expect(rendered.html).toContain('rehype effect');
    expect(rendered.html).toContain('id="user-content-cookie"');
    expect(ac3Violations(rendered.html)).toEqual([]);
    expect(attributeValues(rendered.html, 'a', 'href')).toEqual([]);
  });

  it.each(['js', 'javascript'])('refuses %s front matter through the new renderer API', (language) => {
    const render = createRenderer({ extraRehypePlugins: [] });
    expect(() => render(`---${language}\n({ title: "benign control" })\n---\n# Heading\n`))
      .toThrow(/JavaScript is refused/);
  });

  it('keeps independent route contexts and resets heading slugs when a configured renderer is reused', () => {
    const make = (directory: string, id: string) => createRenderer({
      extraRehypePlugins: [[rewriteSlideLinks, {
        slideSource: `workshop/slides/${directory}/start.md`,
        slides: [{ id, slideSource: `workshop/slides/${directory}/next.md` }],
      }]],
    });
    const left = make('left', 'left-next');
    const right = make('right', 'right-next');
    const raw = '# Repeat\n\n# Repeat\n\n[go](next.md)\n';
    const first = left(raw);
    expect(attributeValues(first.html, 'a', 'href')).toEqual(['#/left-next']);
    expect(attributeValues(right(raw).html, 'a', 'href')).toEqual(['#/right-next']);
    expect(left(raw)).toEqual(first);
    expect(headingIds(first.html)).toEqual(['user-content-repeat', 'user-content-repeat-1']);
  });

  it('binds the build rewrite to each slide source instead of reusing another segment directory', () => {
    const root = fixture();
    const segments = ['left', 'right'].flatMap((dir) => [
      { id: `${dir}-start`, slideSource: `workshop/slides/${dir}/start.md` },
      { id: `${dir}-next`, slideSource: `workshop/slides/${dir}/next.md` },
    ]).map((segment) => ({ ...segment, scriptSource: 'workshop/speaker-scripts/a.md', labRefs: [], minutes: 1 }));
    write(root, DECK, JSON.stringify({ segments }));
    for (const segment of segments) write(root, segment.slideSource, '# Heading\n\n[go](next.md)\n');
    const rendered = loadSegments(root);
    expect(rendered.map((segment) => attributeValues(segment.html, 'a', 'href'))).toEqual([
      ['#/left-next'], ['#/left-next'], ['#/right-next'], ['#/right-next'],
    ]);
  });
});

describe('SPA-03 r2 one-shot recovery on the real Vite watcher', () => {
  it.each([DECK, SLIDE])('recovers after exactly one repair of initially malformed %s', async (brokenFile) => {
    const root = fixture();
    const good = readFileSync(path.join(root, brokenFile), 'utf8');
    write(root, brokenFile, brokenFile === DECK ? '{ "segments": [' : '---\ntitle: [unclosed\n---\n# A\n');
    const { server, sent } = await serverFor(root);
    try {
      await expect(server.transformRequest(VIRTUAL_ID)).rejects.toThrow();
      await watched(server, root, brokenFile);
      sent.length = 0;
      write(root, brokenFile, good);
      await expect.poll(() => sent, { timeout: 10_000 }).toContainEqual(RELOAD);
      const recovered = await server.transformRequest(VIRTUAL_ID);
      expect(recovered?.code).toContain('"title":"A"');
      expect(recovered?.code).toContain('user-content-a');
    } finally {
      await server.close();
    }
  }, 30_000);

  it('still recovers after a successful load followed by a malformed manifest and one repair', async () => {
    const root = fixture();
    const good = readFileSync(path.join(root, DECK), 'utf8');
    const { server, sent } = await serverFor(root);
    try {
      expect((await server.transformRequest(VIRTUAL_ID))?.code).toContain('"title":"A"');
      await watched(server, root, DECK);
      sent.length = 0;
      write(root, DECK, '{ "segments": [');
      await expect.poll(() => sent, { timeout: 10_000 }).toContainEqual(expect.objectContaining({ type: 'full-reload' }));
      await expect(server.transformRequest(VIRTUAL_ID)).rejects.toThrow();
      sent.length = 0;
      write(root, SLIDE, '---\ntitle: Recovered\n---\n# Recovered\n');
      write(root, DECK, good);
      await expect.poll(() => sent, { timeout: 10_000 }).toContainEqual(expect.objectContaining({ type: 'full-reload' }));
      expect((await server.transformRequest(VIRTUAL_ID))?.code).toContain('"title":"Recovered"');
    } finally {
      await server.close();
    }
  }, 30_000);
});
