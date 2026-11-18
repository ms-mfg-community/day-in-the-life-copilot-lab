// Differential check of tests/spa/helpers/fake-dom.ts against real browsers.
//
// The interaction tests run in a fake DOM, because the repository has no DOM library. A fake is worth trusting only where
// it behaves as a browser does, so every scenario below is plain DOM code that runs twice: against the fake in this
// process, and in a real page where the keyboard and the pointer are driven through Playwright. The two observations
// must be identical. A rule the fake enforces (what can take focus, which events bubble, what Enter and Space do to a
// button, where Tab goes next) is then a rule Chromium and Firefox enforce as well.
//
//   node --test tests/spa/fake-dom-browser-check.mjs
//
// Requires Playwright (local or in npm's cache) and its browsers; nothing is installed. As in qa-shell-browser-check.mjs,
// SPA_QA_PLAYWRIGHT_MODULE can name playwright/index.mjs. SPA_QA_BROWSER_TYPE restricts the run to one engine; by default
// chromium and firefox both run. SPA_QA_BROWSER_CHANNEL can select chrome or msedge for chromium.
//
// A scenario's `run` is serialised into the page, so it may use only its argument (the environment below) and the
// standard DOM. It must not close over anything in this file. A scenario with `only: [engine, ...]` runs in those engines
// alone: it records a rule the fake follows where the engines disagree, and the comment beside it says what to avoid.
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);

const ENGINES = process.env.SPA_QA_BROWSER_TYPE ? [process.env.SPA_QA_BROWSER_TYPE] : ['chromium', 'firefox'];
const BLANK_POINT = { x: 960, y: 680 };
/** Where the fake DOM's window is (FakeLocation.base), so both runs see the same URL. */
const PAGE_URL = 'https://spa.test/qa/index.html';

/** A page with nothing under the origin, so the pointer starts over a known element and the spacer is not tabbable. */
const wrap = (html) =>
  `<!doctype html><html><head><style>body{margin:0}</style></head><body><div style="height:40px"></div>${html}</body></html>`;

const scenarios = [
  {
    name: 'focus is refused by what a user cannot reach and accepted by what they can',
    html:
      '<button id="hidden-attribute" hidden>x</button>' +
      '<div hidden><button id="hidden-ancestor">x</button></div>' +
      '<div inert><button id="inert-ancestor">x</button></div>' +
      '<button id="disabled" disabled>x</button>' +
      '<div id="div-without-tabindex">x</div>' +
      '<a id="link-without-href">x</a>' +
      '<button id="button">x</button>' +
      '<a id="link-with-href" href="#x">x</a>' +
      '<div id="div-tabindex-0" tabindex="0">x</div>' +
      '<div id="div-tabindex-minus-1" tabindex="-1">x</div>',
    run: async ({ document, who }) => {
      const result = {};
      for (const el of [...document.querySelectorAll('[id]')]) {
        if (document.activeElement !== document.body) document.activeElement.blur();
        el.focus();
        result[el.id] = who(document.activeElement);
      }
      return result;
    },
  },
  {
    name: 'focus moves with blur, focusout, focus and focusin, each carrying the other element as relatedTarget',
    html: '<button id="a">A</button><button id="b">B</button>',
    run: async ({ document, who }) => {
      const log = [];
      for (const id of ['a', 'b']) {
        for (const type of ['blur', 'focusout', 'focus', 'focusin']) {
          document.querySelector(`#${id}`).addEventListener(type, (event) => log.push(`${id}:${event.type}:${who(event.relatedTarget)}`));
        }
      }
      document.querySelector('#a').focus();
      document.querySelector('#b').focus();
      return log;
    },
  },
  {
    name: 'a focused element that is hidden, made inert, disabled or removed has lost focus to the body once the page has settled',
    html:
      '<button id="a">A</button><button id="b">B</button><button id="c">C</button><button id="d">D</button>' +
      '<div id="w"><button id="e">E</button></div><button id="f">F</button><div id="v"></div>',
    run: async ({ document, who, settle }) => {
      const at = (id) => document.querySelector(`#${id}`);
      const result = {};
      const observe = async (name, id, change) => {
        at(id).focus();
        const before = who(document.activeElement);
        change();
        await settle();
        result[name] = [before, who(document.activeElement)];
      };
      await observe('hidden', 'a', () => {
        at('a').hidden = true;
      });
      at('a').hidden = false;
      await settle();
      result.afterUnhide = who(document.activeElement);
      await observe('inert', 'b', () => {
        at('b').inert = true;
      });
      await observe('disabled', 'c', () => {
        at('c').disabled = true;
      });
      await observe('removed', 'd', () => at('d').remove());
      await observe('ancestor hidden', 'e', () => {
        at('w').hidden = true;
      });
      await observe('moved', 'f', () => at('v').append(at('f')));
      return result;
    },
  },
  {
    name: 'an element hidden and shown again within one task has lost focus',
    only: ['chromium'], // Firefox keeps focus until its next rendering update; no widget may depend on either
    html: '<button id="a">A</button>',
    run: async ({ document, who, settle }) => {
      const button = document.querySelector('#a');
      button.focus();
      button.hidden = true;
      button.hidden = false;
      const sync = who(document.activeElement);
      await settle();
      return { sync, settled: who(document.activeElement) };
    },
  },
  {
    name: 'pointer enter and leave reach each element crossed, outermost first in and innermost first out, and do not bubble',
    html:
      '<div id="start">start</div><div id="root"><button id="a">A</button><div id="pop"><span id="in">in</span></div></div>' +
      '<p id="away">away</p>',
    run: async ({ document, who, moveTo }) => {
      await moveTo('#start');
      const rel = (node) => {
        const name = who(node);
        return name === 'html' || name === 'body' ? '-' : name;
      };
      const logs = { mouse: [], pointer: [], overOut: [] };
      for (const id of ['root', 'a', 'pop', 'in', 'away']) {
        const el = document.querySelector(`#${id}`);
        for (const type of ['mouseenter', 'mouseleave', 'pointerenter', 'pointerleave']) {
          el.addEventListener(type, (event) => {
            const family = type.startsWith('mouse') ? logs.mouse : logs.pointer;
            family.push(`${type}:${id}:target=${who(event.target)}:related=${rel(event.relatedTarget)}`);
          });
        }
      }
      const root = document.querySelector('#root');
      for (const type of ['mouseover', 'mouseout']) root.addEventListener(type, (event) => logs.overOut.push(`${type}:${who(event.target)}`));
      const phases = {};
      for (const [name, selector] of [
        ['into in', '#in'],
        ['to a', '#a'],
        ['to away', '#away'],
        ['off the page', null],
      ]) {
        logs.mouse = [];
        logs.pointer = [];
        logs.overOut = [];
        await moveTo(selector);
        phases[name] = { mouse: logs.mouse, pointer: logs.pointer, overOut: logs.overOut };
      }
      return phases;
    },
  },
  {
    name: 'a click focuses the nearest focusable ancestor, or nothing, unless mousedown is cancelled',
    html:
      '<div id="card" tabindex="0"><span id="s">s</span></div><p id="text">text</p>' +
      '<button id="b">b</button><button id="c">c</button>',
    run: async ({ document, who, click }) => {
      document.querySelector('#b').addEventListener('mousedown', (event) => event.preventDefault());
      const result = {};
      for (const selector of ['#s', '#c', '#b', '#text']) {
        await click(selector);
        result[selector] = who(document.activeElement);
      }
      return result;
    },
  },
  {
    name: 'a button is activated by Enter on keydown and by Space on keyup, and a link by Enter only',
    html: '<button id="b">b</button><div id="d" tabindex="0">d</div><a id="a" href="#x">a</a>',
    run: async ({ document, press }) => {
      const log = [];
      for (const id of ['b', 'd', 'a']) {
        const el = document.querySelector(`#${id}`);
        for (const type of ['keydown', 'keyup']) {
          el.addEventListener(type, (event) => log.push(`${type}:${event.key === ' ' ? 'Space' : event.key}`));
        }
        el.addEventListener('click', () => log.push('click'));
      }
      const result = {};
      for (const [id, keys] of [
        ['b', ['Enter', ' ']],
        ['d', ['Enter', ' ']],
        ['a', [' ', 'Enter']],
      ]) {
        document.querySelector(`#${id}`).focus();
        for (const key of keys) {
          log.length = 0;
          await press(key);
          result[`${id} ${key === ' ' ? 'Space' : key}`] = [...log];
        }
      }
      return result;
    },
  },
  {
    name: 'a button whose keydown is cancelled is not activated by Enter or Space',
    html: '<button id="b">b</button>',
    run: async ({ document, press }) => {
      const button = document.querySelector('#b');
      const log = [];
      button.addEventListener('keydown', (event) => event.preventDefault());
      button.addEventListener('click', () => log.push('click'));
      button.focus();
      const result = {};
      for (const key of ['Enter', ' ']) {
        log.length = 0;
        await press(key);
        result[key === ' ' ? 'Space' : key] = [...log];
      }
      return result;
    },
  },
  {
    name: 'Tab visits what is tabbable in document order and skips the rest',
    html:
      '<button id="a">a</button><button id="skip-negative" tabindex="-1">s</button><button id="b">b</button>' +
      '<button id="skip-hidden" hidden>s</button><div inert><button id="skip-inert">s</button></div>' +
      '<button id="skip-disabled" disabled>s</button><div id="c" tabindex="0">c</div><a id="d" href="#d">d</a>',
    run: async ({ document, who, press }) => {
      const forward = [];
      for (let step = 0; step < 4; step += 1) {
        await press('Tab');
        forward.push(who(document.activeElement));
      }
      const backward = [];
      for (let step = 0; step < 3; step += 1) {
        await press('Tab', { shift: true });
        backward.push(who(document.activeElement));
      }
      return { forward, backward };
    },
  },
  {
    name: 'Tab leaves the page after the last tabbable element and comes back to the first',
    only: ['chromium'], // Firefox stays on the last element; no widget may depend on either
    html: '<button id="a">a</button><button id="b">b</button>',
    run: async ({ document, who, press }) => {
      const forward = [];
      for (let step = 0; step < 5; step += 1) {
        await press('Tab');
        forward.push(who(document.activeElement));
      }
      const backward = [];
      for (let step = 0; step < 3; step += 1) {
        await press('Tab', { shift: true });
        backward.push(who(document.activeElement));
      }
      return { forward, backward };
    },
  },
  {
    name: 'Tab from an element that is focusable but not tabbable continues from its place in the document',
    html: '<button id="a">a</button><div id="m" tabindex="-1"><button id="in">i</button></div><button id="z">z</button>',
    run: async ({ document, who, press }) => {
      const at = (id) => document.querySelector(`#${id}`);
      at('m').focus();
      await press('Tab');
      const forward = who(document.activeElement);
      at('m').focus();
      await press('Tab', { shift: true });
      return { forward, backward: who(document.activeElement) };
    },
  },
  {
    name: 'tabIndex and the reflected attributes agree',
    html:
      '<button id="button">b</button><button id="disabled-button" disabled>b</button><a id="link">l</a><a id="link-href" href="#x">l</a>' +
      '<div id="div">d</div><div id="div-0" tabindex="0">d</div><div id="div-minus" tabindex="-1">d</div><span id="span-2" tabindex="2">s</span>',
    run: async ({ document }) => {
      const result = {};
      for (const el of [...document.querySelectorAll('[id]')]) result[el.id] = el.tabIndex;
      const button = document.querySelector('#button');
      const reflect = [];
      button.hidden = true;
      reflect.push(button.getAttribute('hidden'), button.hidden);
      button.hidden = false;
      reflect.push(button.hasAttribute('hidden'), button.hidden);
      button.inert = true;
      reflect.push(button.hasAttribute('inert'), button.inert);
      button.inert = false;
      reflect.push(button.hasAttribute('inert'));
      button.disabled = true;
      reflect.push(button.hasAttribute('disabled'), button.disabled);
      button.tabIndex = -1;
      reflect.push(button.getAttribute('tabindex'));
      result.reflect = reflect;
      return result;
    },
  },
  {
    name: 'selectors return the same elements in the same order',
    html:
      '<section id="s" class="a b"><ul><li id="one" data-k="alpha">1</li><li id="two" data-k="beta" class="b">2</li></ul>' +
      '<div role="tab" aria-selected="true" id="t1"></div><div role="tab" aria-selected="false" id="t2"></div></section>',
    run: async ({ document }) => {
      const result = {};
      for (const selector of [
        'li',
        '#two',
        '.b',
        'li.b',
        '[data-k]',
        '[data-k=alpha]',
        '[data-k="beta"]',
        '[data-k^=al]',
        '[data-k$=ta]',
        '[data-k*=lph]',
        'li:not(.b)',
        'section li',
        'section > li',
        'ul > li',
        'li + li',
        'li ~ li',
        '[role=tab][aria-selected=true]',
        '#one, #t2',
        'section > ul > li:not([data-k=alpha])',
        'div[role="tab"]:not([aria-selected="true"])',
      ]) {
        result[selector] = [...document.querySelectorAll(selector)].map((el) => el.id);
      }
      const one = document.querySelector('#one');
      result.closest = [one.closest('section').id, one.closest('li').id, one.closest('ol')];
      result.matches = [one.matches('ul > li[data-k=alpha]'), one.matches('ol > li')];
      const section = document.querySelector('#s');
      result.descendantsOnly = [section.querySelectorAll('section').length, section.querySelectorAll('section li').length];
      return result;
    },
  },
  {
    name: 'innerHTML parses and serialises the markup the content pipeline produces',
    html: '',
    run: async ({ document }) => {
      const result = [];
      for (const sample of [
        '<p id="p" title="a > b" data-x=bare>1 &#x3C; 2 &#x26; 3 &#x3E; 0 &amp;lt;</p><img id="i" alt="x"><br><hr id="h">',
        '<pre id="a">\nline</pre><pre id="b"><code>\nkept</code></pre><p id="p2">1 < 2</p>',
        '<div id="d" data-q="a&quot;b"><p>x &#x3C; y &#x26; z</p><hr></div>',
        '<ul><li><strong>One</strong> first <code>x &#x26;&#x26; y</code></li><li>two</li></ul>',
        '<h2 id="user-content-t"><button type="button" aria-expanded="true">Title</button></h2><script>if (a < b) { x = "</p>"; }</script>after',
      ]) {
        const box = document.createElement('div');
        box.innerHTML = sample;
        result.push({ html: box.innerHTML, text: box.textContent, children: box.children.length });
      }
      return result;
    },
  },
  {
    name: 'inserting, moving and replacing nodes keeps document order',
    html: '',
    run: async ({ document }) => {
      const make = (tag, id) => {
        const el = document.createElement(tag);
        el.id = id;
        el.textContent = id;
        return el;
      };
      const box = document.createElement('div');
      box.innerHTML = '<ul id="u"><li id="m">m</li></ul><div id="b"></div>';
      const u = box.querySelector('#u');
      const m = box.querySelector('#m');
      const b = box.querySelector('#b');
      m.before(make('li', 'a'));
      m.after(make('li', 'z'));
      u.prepend(make('li', 'first'));
      u.insertBefore(make('li', 'x'), m);
      b.append(u.querySelector('#z'));
      const steps = [box.innerHTML];
      m.replaceWith(make('li', 'n'));
      steps.push(box.innerHTML);
      b.replaceChildren(make('i', 'only'), 'tail');
      steps.push(box.innerHTML);
      b.textContent = 'plain';
      steps.push(box.innerHTML);
      const copy = u.cloneNode(true);
      copy.id = 'copy';
      box.append(copy);
      steps.push(box.innerHTML);
      steps.push([u.contains(m), u.contains(box.querySelector('#n')), box.contains(u), u.contains(box)]);
      let refused = false;
      try {
        u.append(u);
      } catch (error) {
        refused = /HierarchyRequestError/.test(`${error.name} ${error.message}`);
      }
      steps.push(refused);
      return steps;
    },
  },
  {
    name: 'a hash change fires hashchange on a later task, once, and a link click follows its fragment unless cancelled',
    html: '<a id="l" href="#/m2-mcp">l</a><a id="n" href="#/m3">n</a>',
    run: async ({ document, window, nextTask }) => {
      const result = {};
      let changes = 0;
      window.addEventListener('hashchange', () => {
        changes += 1;
      });
      window.location.hash = '#/m2-mcp';
      result.sync = changes;
      await nextTask();
      result.afterTask = [changes, window.location.hash];
      window.location.hash = '#/m2-mcp';
      await nextTask();
      result.sameValue = changes;
      window.location.replace(`${window.location.href.split('#')[0]}#/m3`);
      await nextTask();
      result.afterReplace = [changes, window.location.hash];
      document.querySelector('#n').addEventListener('click', (event) => event.preventDefault());
      window.location.hash = '';
      document.querySelector('#l').click();
      await nextTask(); // Chromium follows the link at once and Firefox on a later task, so read it after a task
      const followed = window.location.hash;
      document.querySelector('#n').click();
      await nextTask();
      result.links = [followed, window.location.hash];
      return result;
    },
  },
];

let fakeDom;
let automation;
const browsers = new Map();

function playwrightModule() {
  if (process.env.SPA_QA_PLAYWRIGHT_MODULE) return process.env.SPA_QA_PLAYWRIGHT_MODULE;
  try {
    return require.resolve('playwright');
  } catch {
    const cache = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'npm-cache/_npx')
      : path.join(os.homedir(), '.npm/_npx');
    for (const entry of existsSync(cache) ? readdirSync(cache) : []) {
      const module = path.join(cache, entry, 'node_modules/playwright/index.mjs');
      if (existsSync(module)) return module;
    }
    throw new Error('Playwright is unavailable; set SPA_QA_PLAYWRIGHT_MODULE to an installed playwright/index.mjs.');
  }
}

/** The fake DOM is TypeScript with an extensionless import, so bundle it and load the result. */
async function loadFakeDom() {
  const esbuild = await import('esbuild');
  const build = esbuild.build ?? esbuild.default.build;
  const bundle = await build({
    entryPoints: [path.join(ROOT, 'tests/spa/helpers/fake-dom.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
}

const plain = (value) => JSON.parse(JSON.stringify(value));

async function observeInFake(scenario) {
  const { document, window, keyboard, pointer } = fakeDom.createBrowser(wrap(scenario.html));
  const env = {
    document,
    window,
    who: (node) =>
      node == null ? '-' : node === document.body ? 'body' : node === document.documentElement ? 'html' : node.id || node.localName,
    press: async (key, options = {}) => {
      keyboard.press(key, { shift: options.shift === true });
    },
    moveTo: async (selector) => {
      pointer.moveTo(selector === null ? null : document.querySelector(selector));
    },
    click: async (selector) => {
      pointer.click(document.querySelector(selector));
    },
    settle: async () => {},
    nextTask: async () => {
      await Promise.resolve();
    },
  };
  return plain(await scenario.run(env));
}

async function observeInBrowser(browser, scenario) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(5000);
  try {
    await page.exposeFunction('__press', (key, shift) => page.keyboard.press(shift ? `Shift+${key}` : key));
    await page.exposeFunction('__move', (x, y) => page.mouse.move(x, y));
    await page.exposeFunction('__click', (x, y) => page.mouse.click(x, y));
    // A real address, served from memory: an about:blank page will not follow a fragment link in every engine.
    await page.route('**/*', (route) =>
      route.request().url().startsWith(PAGE_URL)
        ? route.fulfill({ status: 200, contentType: 'text/html', body: wrap(scenario.html) })
        : route.abort(),
    );
    await page.goto(PAGE_URL);
    await page.bringToFront();
    const observation = await page.evaluate(
      async ({ source, blank }) => {
        const centre = (selector) => {
          const box = document.querySelector(selector).getBoundingClientRect();
          return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        };
        const env = {
          document,
          window,
          who: (node) =>
            node == null ? '-' : node === document.body ? 'body' : node === document.documentElement ? 'html' : node.id || node.localName,
          press: async (key, options = {}) => {
            await window.__press(key === ' ' ? 'Space' : key, options.shift === true);
          },
          moveTo: async (selector) => {
            const point = selector === null ? blank : centre(selector);
            await window.__move(point.x, point.y);
          },
          click: async (selector) => {
            const point = centre(selector);
            await window.__click(point.x, point.y);
          },
          settle: () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 20)))),
          nextTask: () => new Promise((resolve) => setTimeout(resolve, 40)),
        };
        return await new Function(`return (${source});`)()(env);
      },
      { source: scenario.run.toString(), blank: BLANK_POINT },
    );
    assert.deepEqual(errors, [], 'the scenario must not throw in the page');
    return plain(observation);
  } finally {
    await page.close();
  }
}

before(async () => {
  fakeDom = await loadFakeDom();
  automation = await import(pathToFileURL(playwrightModule()).href);
  for (const engine of ENGINES) {
    assert.ok(['chromium', 'firefox', 'webkit'].includes(engine), `Unsupported browser type: ${engine}`);
    const channel = engine === 'chromium' ? process.env.SPA_QA_BROWSER_CHANNEL : undefined;
    const browser = await automation[engine].launch({ headless: true, ...(channel ? { channel } : {}) });
    console.log(`Browser: ${engine} ${browser.version()}`);
    browsers.set(engine, browser);
  }
});

after(async () => {
  for (const browser of browsers.values()) await browser.close();
});

for (const engine of ENGINES) {
  describe(engine, () => {
    for (const scenario of scenarios) {
      if (scenario.only !== undefined && !scenario.only.includes(engine)) continue;
      test(scenario.name, async () => {
        const fake = await observeInFake(scenario);
        const real = await observeInBrowser(browsers.get(engine), scenario);
        assert.deepStrictEqual(fake, real, `the fake DOM and ${engine} disagree`);
      });
    }
  });
}
