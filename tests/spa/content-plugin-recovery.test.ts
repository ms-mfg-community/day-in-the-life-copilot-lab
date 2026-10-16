// The content plugin on the dev server, when its first load throws: a manifest that does not parse, a slide that does
// not render. Repairing the file has to bring the page back without anyone reloading it by hand.
//
// Registering the watch before the parse is necessary and not sufficient. Vite links a watched file to the module that
// watched it only after that module's load returns, so a load that threw leaves the repaired file mapped to nothing,
// and Vite then sends nothing at all. The plugin has to tell the page itself, which is what the first describe checks
// against a stand-in for the server, and the second against the real thing.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer, normalizePath } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';
import { spaContentPlugin } from '../../workshop/spa/vite-content-plugin';

const VIRTUAL_ID = '\0virtual:spa-content';
const DECK = 'workshop/spa/content/deck.json';
const RELOAD = { type: 'full-reload', path: '*' };

type Load = (this: { addWatchFile(file: string): void }, id: string) => string | undefined;
type HotUpdate = (context: {
  file: string;
  modules: unknown[];
  server: { hot: { send(payload: unknown): void } };
}) => unknown;

const roots: string[] = [];
afterEach(() => {
  // Retries, like every other temp-directory cleanup in these tests: on Windows the handle a watcher held on the
  // directory can outlive server.close() by a moment.
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

/** A repository with the three directories the plugin reads from, and nothing in them. */
function repo(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'spa-recovery-'));
  roots.push(root);
  for (const dir of ['workshop/spa/content', 'workshop/slides', 'workshop/speaker-scripts']) {
    mkdirSync(path.join(root, dir), { recursive: true });
  }
  return root;
}

const write = (root: string, file: string, text: string) => writeFileSync(path.join(root, file), text);
const slide = (id: string) => `workshop/slides/${id}.md`;
const script = (id: string) => `workshop/speaker-scripts/${id}.md`;
const GOOD = (title: string) => `---\ntitle: ${title}\n---\n# ${title}\n`;
const NOT_YAML = '---\ntitle: [unclosed\n---\n# A\n';

const deckOf = (...ids: string[]) =>
  JSON.stringify({
    segments: ids.map((id) => ({ id, slideSource: slide(id), scriptSource: script(id), labRefs: [], minutes: 1 })),
  });

/** A repository whose manifest names `ids`, each with a good slide and a script. */
function deckedRepo(...ids: string[]): string {
  const root = repo();
  write(root, DECK, deckOf(...ids));
  for (const id of ids) {
    write(root, slide(id), GOOD(id.toUpperCase()));
    write(root, script(id), `# ${id}\n`);
  }
  return root;
}

/** The plugin's two hooks, called the way Vite calls them, against a server that only records what it is told. */
function harness(root: string) {
  const plugin = spaContentPlugin(root);
  const sent: unknown[] = [];
  const load = () => (plugin.load as unknown as Load).call({ addWatchFile: () => undefined }, VIRTUAL_ID);
  const hotUpdate = (file: string, modules: unknown[] = []) =>
    (plugin.handleHotUpdate as unknown as HotUpdate)({
      file: normalizePath(path.join(root, file)),
      modules,
      server: { hot: { send: (payload) => sent.push(payload) } },
    });
  return { load, hotUpdate, sent };
}

describe('after a load that threw, repairing the file reloads the page', () => {
  it('reloads when a manifest that did not parse is repaired', () => {
    const root = repo();
    write(root, DECK, '{ "segments": [ ');
    const { load, hotUpdate, sent } = harness(root);
    expect(load).toThrow();

    write(root, DECK, deckOf());
    // Vite maps nothing to the repaired file, so it hands the hook an empty list of modules.
    expect(hotUpdate(DECK)).toEqual([]);
    expect(sent).toEqual([RELOAD]);
    // The reloaded page asks for the module again, and now it builds.
    expect(load()).toBe('export const segments = [];');
  });

  it('reloads when a slide that did not render is repaired', () => {
    const root = deckedRepo('a');
    write(root, slide('a'), NOT_YAML);
    const { load, hotUpdate, sent } = harness(root);
    expect(load).toThrow();

    write(root, slide('a'), GOOD('A'));
    expect(hotUpdate(slide('a'))).toEqual([]);
    expect(sent).toEqual([RELOAD]);
    expect(load()).toContain('"title":"A"');
  });
});

describe('what the hook leaves to Vite', () => {
  it('leaves a file that Vite has mapped to a module, because Vite reloads the page for it', () => {
    const root = deckedRepo('a');
    const { load, hotUpdate, sent } = harness(root);
    expect(load()).toContain('"id":"a"');

    expect(hotUpdate(DECK, [{}])).toBeUndefined();
    expect(hotUpdate(slide('a'), [{}])).toBeUndefined();
    expect(sent).toEqual([]);
  });

  it('ignores a file the module is not built from', () => {
    const root = deckedRepo('a');
    write(root, DECK, '{ "segments": [ ');
    const { load, hotUpdate, sent } = harness(root);
    expect(load).toThrow();

    expect(hotUpdate(slide('unrelated'))).toBeUndefined();
    expect(hotUpdate('workshop/spa/src/main.ts')).toBeUndefined();
    expect(sent).toEqual([]);
  });

  it('has nothing to say before the module has ever been requested', () => {
    const root = deckedRepo('a');
    const { hotUpdate, sent } = harness(root);

    expect(hotUpdate(DECK)).toBeUndefined();
    expect(hotUpdate(slide('a'))).toBeUndefined();
    expect(sent).toEqual([]);
  });

  it('forgets the files an earlier load was built from, so a slide the manifest dropped is no longer its business', () => {
    const root = deckedRepo('a', 'b');
    const { load, hotUpdate, sent } = harness(root);
    expect(load()).toContain('"id":"b"');
    expect(hotUpdate(slide('a'))).toEqual([]);

    write(root, DECK, deckOf('b'));
    expect(load()).not.toContain('"id":"a"');
    sent.length = 0;
    expect(hotUpdate(slide('a'))).toBeUndefined();
    expect(hotUpdate(slide('b'))).toEqual([]);
    expect(sent).toEqual([RELOAD]);
  });
});

describe('against a real Vite dev server', () => {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('brings the page back once a manifest that did not parse on the first load is repaired', async () => {
    const root = deckedRepo('a');
    const spaRoot = path.join(root, 'workshop/spa');
    write(root, 'workshop/spa/main.js', "import { segments } from 'virtual:spa-content';\nexport default segments;\n");
    write(root, DECK, '{ "segments": [ ');

    const server = await createServer({
      root: spaRoot,
      configFile: false,
      logLevel: 'silent',
      plugins: [spaContentPlugin(root)],
      optimizeDeps: { noDiscovery: true, include: [] },
      // No socket to bind: what the server would tell a browser is recorded below instead.
      server: { middlewareMode: true, ws: false },
    });
    try {
      const sent: unknown[] = [];
      const hot = server.hot as unknown as { send: (...args: unknown[]) => void };
      const send = hot.send.bind(hot);
      hot.send = (...args) => {
        sent.push(args.length === 1 ? args[0] : args);
        send(...args);
      };

      // The page's first request: the module the manifest feeds fails, as it did for the person who typed the comma wrong.
      await server.transformRequest('/main.js');
      await expect(server.transformRequest(VIRTUAL_ID)).rejects.toThrow();

      // Repair it, and keep touching it until the server has noticed: a watch that was still being set up when the file
      // was first repaired never sees that change, and a loaded machine can be slow to finish setting it up.
      const deadline = Date.now() + 20_000;
      for (let attempt = 0; sent.length === 0 && Date.now() < deadline; attempt++) {
        write(root, DECK, `${deckOf('a')}${' '.repeat(attempt)}`);
        await sleep(250);
      }

      expect(sent).toContainEqual(RELOAD);
      // The reloaded page asks again, and the manifest is whole.
      const reloaded = await server.transformRequest(VIRTUAL_ID);
      expect(reloaded?.code).toContain('"id":"a"');
    } finally {
      await server.close();
    }
  }, 40_000);
});
