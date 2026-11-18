// Self-test of tests/spa/helpers/fake-dom.ts, the DOM the interaction tests run in. An oracle that cannot fail proves
// nothing, so each rule it enforces is checked here in both directions: the case that must be allowed and the case that
// must be refused.
//
// A self-test only shows that the fake does what its author believes, so the rules are also compared with real browsers:
// tests/spa/fake-dom-browser-check.mjs runs the same scenarios in this fake and in Chromium and Firefox and requires
// identical observations (run it with `node --test tests/spa/fake-dom-browser-check.mjs`; it needs Playwright, so it is
// not part of `npm test`). Two rules below follow Chromium where the engines differ from each other, and say so: the
// moment focus is cleared, and where Tab goes after the last tabbable element.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadSegments } from '../../workshop/spa/vite-content-plugin';
import { createBrowser, FakeEvent, tabOrder, type FakeElement } from './helpers/fake-dom';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function page(bodyHtml: string) {
  const browser = createBrowser(`<!doctype html><html><head></head><body>${bodyHtml}</body></html>`);
  const $ = (selector: string): FakeElement => {
    const found = browser.document.querySelector(selector);
    if (found === null) throw new Error(`no element matches ${selector}`);
    return found;
  };
  return { ...browser, $ };
}

describe('fake DOM: focus follows the browser rules', () => {
  it('moves focus and fires blur, focusout, focus, focusin in that order, with relatedTarget', () => {
    const { $, document } = page('<button id="a">A</button><button id="b">B</button>');
    const log: string[] = [];
    for (const id of ['a', 'b']) {
      for (const type of ['blur', 'focusout', 'focus', 'focusin']) {
        $(`#${id}`).addEventListener(type, (event) => {
          log.push(`${id}:${event.type}:${(event.relatedTarget as FakeElement | null)?.id ?? '-'}`);
        });
      }
    }
    $('#a').focus();
    $('#b').focus();
    expect(log).toEqual(['a:focus:-', 'a:focusin:-', 'a:blur:b', 'a:focusout:b', 'b:focus:a', 'b:focusin:a']);
    expect(document.activeElement.id).toBe('b');
  });

  it.each([
    ['an element with the hidden attribute', '<button id="t" hidden>x</button>'],
    ['an element inside a hidden ancestor', '<div hidden><button id="t">x</button></div>'],
    ['an element inside an inert ancestor', '<div inert><button id="t">x</button></div>'],
    ['a disabled button', '<button id="t" disabled>x</button>'],
    ['a div that has no tabindex', '<div id="t">x</div>'],
    ['a link that has no href', '<a id="t">x</a>'],
  ])('ignores focus() on %s', (_name, html) => {
    const { $, document } = page(html);
    $('#t').focus();
    expect(document.activeElement).toBe(document.body);
  });

  it.each([
    ['a button', '<button id="t">x</button>'],
    ['a link with an href', '<a id="t" href="#x">x</a>'],
    ['a div with tabindex 0', '<div id="t" tabindex="0">x</div>'],
    ['a div with tabindex -1', '<div id="t" tabindex="-1">x</div>'],
  ])('accepts focus() on %s', (_name, html) => {
    const { $, document } = page(html);
    $('#t').focus();
    expect(document.activeElement).toBe($('#t'));
  });

  it('ignores focus() on a detached element', () => {
    const { document } = page('');
    const loose = document.createElement('button');
    loose.focus();
    expect(document.activeElement).toBe(document.body);
  });

  it('un-hides before it focuses: the same call in the other order leaves focus nowhere', () => {
    const { $, document } = page('<div id="box" hidden><button id="t">x</button></div>');
    $('#t').focus(); // still hidden: refused
    expect(document.activeElement).toBe(document.body);
    $('#box').hidden = false;
    $('#t').focus();
    expect(document.activeElement).toBe($('#t'));
  });

  it('falls back to body when the focused element is hidden, inerted, disabled, moved or removed, and does not take focus back', () => {
    const { $, document } = page(
      '<button id="a">A</button><button id="b">B</button><button id="c">C</button><button id="d">D</button><button id="e">E</button><div id="v"></div>',
    );
    $('#a').focus();
    $('#a').hidden = true;
    expect(document.activeElement).toBe(document.body);
    $('#a').hidden = false;
    expect(document.activeElement).toBe(document.body); // un-hiding does not bring focus back

    $('#b').focus();
    $('#b').inert = true;
    expect(document.activeElement).toBe(document.body);

    $('#c').focus();
    $('#c').disabled = true;
    expect(document.activeElement).toBe(document.body);

    $('#d').focus();
    $('#v').append($('#d')); // a node that is moved is removed first, so a focused one loses focus
    expect(document.activeElement).toBe(document.body);

    $('#e').focus();
    $('#e').remove();
    expect(document.activeElement).toBe(document.body);
  });

  it('clears focus the moment the element stops being focusable, so showing it again in the same task does not restore it', () => {
    // Chromium acts at once on an element's own `hidden`; Firefox waits for its next rendering update. The fake is
    // eager (see the header), so a widget that hides a focused element and shows it again must focus it again.
    const { $, document } = page('<button id="a">A</button>');
    $('#a').focus();
    $('#a').hidden = true;
    $('#a').hidden = false;
    expect(document.activeElement).toBe(document.body);
  });

  it('fires no blur or focusout when focus is lost this way, because the engines disagree about them', () => {
    const { $ } = page('<button id="a">A</button>');
    const seen: string[] = [];
    for (const type of ['blur', 'focusout']) $('#a').addEventListener(type, (event) => seen.push(event.type));
    $('#a').focus();
    $('#a').hidden = true;
    expect(seen).toEqual([]);
  });

  it('blur() returns focus to body', () => {
    const { $, document } = page('<button id="a">A</button>');
    $('#a').focus();
    $('#a').blur();
    expect(document.activeElement).toBe(document.body);
  });
});

describe('fake DOM: events', () => {
  it('bubbles keydown to the document and the window, but not focus (focusin does)', () => {
    const { $, document, window } = page('<div id="outer"><button id="inner">x</button></div>');
    const seen: string[] = [];
    for (const [name, target] of [
      ['outer', $('#outer')],
      ['document', document],
      ['window', window],
    ] as const) {
      for (const type of ['keydown', 'focus', 'focusin']) target.addEventListener(type, (event) => seen.push(`${name}:${event.type}`));
    }
    $('#inner').dispatchEvent(new FakeEvent('keydown', { key: 'a' }));
    $('#inner').focus();
    expect(seen).toEqual(['outer:keydown', 'document:keydown', 'window:keydown', 'outer:focusin', 'document:focusin', 'window:focusin']);
  });

  it('runs capture listeners before the target and bubble listeners, and honours once and stopPropagation', () => {
    const { $ } = page('<div id="outer"><button id="inner">x</button></div>');
    const order: string[] = [];
    $('#outer').addEventListener('click', () => order.push('outer-bubble'));
    $('#outer').addEventListener('click', () => order.push('outer-capture'), true);
    $('#inner').addEventListener('click', () => order.push('inner'), { once: true });
    $('#inner').click();
    $('#inner').click();
    expect(order).toEqual(['outer-capture', 'inner', 'outer-bubble', 'outer-capture', 'outer-bubble']);

    const stopped: string[] = [];
    $('#inner').addEventListener('keydown', (event) => {
      stopped.push('inner');
      event.stopPropagation();
    });
    $('#outer').addEventListener('keydown', () => stopped.push('outer'));
    $('#inner').dispatchEvent(new FakeEvent('keydown'));
    expect(stopped).toEqual(['inner']);
  });

  it('preventDefault only counts on a cancelable event, and the same listener is not added twice', () => {
    const { $ } = page('<button id="a">x</button>');
    let calls = 0;
    const listener = (event: FakeEvent): void => {
      calls += 1;
      event.preventDefault();
    };
    $('#a').addEventListener('keydown', listener);
    $('#a').addEventListener('keydown', listener);
    expect($('#a').listenerCount('keydown')).toBe(1);
    const keydown = new FakeEvent('keydown');
    $('#a').dispatchEvent(keydown);
    expect([calls, keydown.defaultPrevented]).toEqual([1, true]);

    $('#a').addEventListener('focusin', listener);
    const focusin = new FakeEvent('focusin');
    $('#a').dispatchEvent(focusin);
    expect(focusin.defaultPrevented).toBe(false);
    $('#a').removeEventListener('keydown', listener);
    expect($('#a').listenerCount('keydown')).toBe(0);
  });
});

describe('fake DOM: the pointer', () => {
  const markup = '<div id="root"><button id="a">A</button><div id="pop"><span id="in">in</span></div></div><p id="away">away</p>';

  function record(page_: ReturnType<typeof page>): string[] {
    const log: string[] = [];
    for (const id of ['root', 'a', 'pop', 'in']) {
      for (const type of ['mouseenter', 'mouseleave', 'pointerenter', 'pointerleave']) {
        page_.$(`#${id}`).addEventListener(type, (event) => log.push(`${id}:${event.type}`));
      }
    }
    return log;
  }

  it('sends enter outermost first and leave innermost first, to every element crossed, and not to the ones kept', () => {
    const p = page(markup);
    const log = record(p);
    p.pointer.moveTo(p.$('#in'));
    expect(log.filter((entry) => entry.includes('mouseenter'))).toEqual(['root:mouseenter', 'pop:mouseenter', 'in:mouseenter']);
    log.length = 0;
    p.pointer.moveTo(p.$('#a')); // within root: only the leaf pair changes, and leave goes innermost first
    expect(log.filter((entry) => !entry.includes('pointer'))).toEqual(['in:mouseleave', 'pop:mouseleave', 'a:mouseenter']);
    log.length = 0;
    p.pointer.moveTo(p.$('#away'));
    expect(log.filter((entry) => entry.includes('mouseleave'))).toEqual(['a:mouseleave', 'root:mouseleave']);
  });

  it('does not bubble enter and leave: a listener on the root hears about the root, not its children', () => {
    const p = page(markup);
    const heard: string[] = [];
    p.$('#root').addEventListener('mouseenter', (event) => heard.push((event.target as FakeElement).id));
    p.pointer.moveTo(p.$('#a'));
    p.pointer.moveTo(p.$('#in'));
    p.pointer.moveTo(p.$('#a'));
    expect(heard).toEqual(['root']); // once, on the way in, and never for a child
  });

  it('refuses to point at something a user could not: a hidden, inert or detached element', () => {
    const p = page('<div id="h" hidden><span id="s">x</span></div><div id="i" inert><span id="t">y</span></div>');
    expect(() => p.pointer.moveTo(p.$('#s'))).toThrow(/cannot land/);
    expect(() => p.pointer.moveTo(p.$('#t'))).toThrow(/cannot land/);
    expect(() => p.pointer.moveTo(p.document.createElement('span'))).toThrow(/cannot land/);
  });

  it('click moves focus to the nearest focusable ancestor, or to nowhere, unless mousedown is cancelled', () => {
    const p = page('<div id="card" tabindex="0"><span id="s">s</span></div><p id="text">t</p><button id="b">b</button>');
    p.pointer.click(p.$('#s'));
    expect(p.document.activeElement).toBe(p.$('#card'));
    p.pointer.click(p.$('#text'));
    expect(p.document.activeElement).toBe(p.document.body);
    p.$('#b').addEventListener('mousedown', (event) => event.preventDefault());
    p.pointer.click(p.$('#b'));
    expect(p.document.activeElement).toBe(p.document.body);
  });
});

describe('fake DOM: the keyboard', () => {
  it('activates a button with Enter on keydown and with Space on keyup, and not when keydown is cancelled', () => {
    const { $, keyboard } = page('<button id="b">b</button>');
    const events: string[] = [];
    $('#b').addEventListener('keydown', (event) => events.push(`down:${event.key === ' ' ? 'Space' : event.key}`));
    $('#b').addEventListener('keyup', (event) => events.push(`up:${event.key === ' ' ? 'Space' : event.key}`));
    $('#b').addEventListener('click', () => events.push('click'));
    $('#b').focus();
    keyboard.press('Enter');
    keyboard.press(' ');
    expect(events).toEqual(['down:Enter', 'click', 'up:Enter', 'down:Space', 'up:Space', 'click']);

    events.length = 0;
    $('#b').addEventListener('keydown', (event) => event.preventDefault());
    keyboard.press('Enter');
    keyboard.press(' ');
    expect(events.filter((entry) => entry === 'click')).toEqual([]);
  });

  it('does not activate what is not natively activatable: a div, a link on Space, a disabled button', () => {
    const { $, keyboard } = page('<div id="d" tabindex="0">d</div><a id="a" href="#x">a</a><button id="x" disabled>x</button>');
    let clicks = 0;
    for (const id of ['d', 'a', 'x']) $(`#${id}`).addEventListener('click', () => (clicks += 1));
    $('#d').focus();
    keyboard.press('Enter');
    keyboard.press(' ');
    $('#a').focus();
    keyboard.press(' ');
    expect(clicks).toBe(0);
    keyboard.press('Enter');
    expect(clicks).toBe(1);
  });

  it('Tab visits the tabbable elements in order, skipping tabindex -1, hidden, inert and disabled ones', () => {
    const { $, document, keyboard } = page(
      '<button id="a">a</button><button id="skip1" tabindex="-1">s</button><button id="b">b</button>' +
        '<button id="skip2" hidden>s</button><div inert><button id="skip3">s</button></div>' +
        '<button id="skip4" disabled>s</button><div id="c" tabindex="0">c</div><a id="d" href="#d">d</a>',
    );
    expect(tabOrder(document).map((el) => el.id)).toEqual(['a', 'b', 'c', 'd']);
    const visited: string[] = [];
    for (let step = 0; step < 4; step += 1) {
      keyboard.press('Tab');
      visited.push(document.activeElement.id);
    }
    expect(visited).toEqual(['a', 'b', 'c', 'd']);
    keyboard.press('Tab'); // past the last one, focus leaves the page (Chromium; Firefox stays put, so no widget may rely on it)
    expect(document.activeElement).toBe(document.body);
    keyboard.press('Tab');
    expect(document.activeElement).toBe($('#a'));
    keyboard.press('Tab', { shift: true }); // first -> out of the page
    expect(document.activeElement).toBe(document.body);
    keyboard.press('Tab', { shift: true });
    expect(document.activeElement).toBe($('#d'));
    keyboard.press('Tab', { shift: true });
    expect(document.activeElement).toBe($('#c'));
  });

  it('a cancelled Tab does not move focus, and the keyup goes to the element that has focus by then', () => {
    const { $, document, keyboard } = page('<button id="a">a</button><button id="b">b</button>');
    $('#a').focus();
    const ups: string[] = [];
    for (const id of ['a', 'b']) $(`#${id}`).addEventListener('keyup', () => ups.push(id));
    keyboard.press('Tab');
    expect(document.activeElement).toBe($('#b'));
    expect(ups).toEqual(['b']);
    $('#b').addEventListener('keydown', (event) => event.preventDefault());
    keyboard.press('Tab');
    expect(document.activeElement).toBe($('#b'));
  });

  it('Tab from an element that is focusable but not tabbable continues from its place in the document', () => {
    const { $, document, keyboard } = page('<button id="a">a</button><div id="m" tabindex="-1"><button id="in">i</button></div><button id="z">z</button>');
    $('#m').focus();
    keyboard.press('Tab');
    expect(document.activeElement).toBe($('#in'));
    $('#m').focus();
    keyboard.press('Tab', { shift: true });
    expect(document.activeElement).toBe($('#a'));
  });

  it('refuses a positive tabindex rather than guessing at the order it would make', () => {
    const { document } = page('<button tabindex="3">a</button>');
    expect(() => tabOrder(document)).toThrow(/positive tabindex/);
  });
});

describe('fake DOM: selectors', () => {
  const markup =
    '<section id="s" class="a b"><ul><li id="one" data-k="alpha">1</li><li id="two" data-k="beta" class="b">2</li></ul>' +
    '<div role="tab" aria-selected="true" id="t1"></div><div role="tab" aria-selected="false" id="t2"></div></section>';

  it.each([
    ['li', ['one', 'two']],
    ['#two', ['two']],
    ['.b', ['s', 'two']],
    ['li.b', ['two']],
    ['[data-k]', ['one', 'two']],
    ['[data-k=alpha]', ['one']],
    ['[data-k="beta"]', ['two']],
    ['[data-k^=al]', ['one']],
    ['[data-k$=ta]', ['two']],
    ['[data-k*=lph]', ['one']],
    ['li:not(.b)', ['one']],
    ['section li', ['one', 'two']],
    ['section > li', []],
    ['ul > li', ['one', 'two']],
    ['li + li', ['two']],
    ['li ~ li', ['two']],
    ['[role=tab][aria-selected=true]', ['t1']],
    ['#one, #t2', ['one', 't2']],
  ])('querySelectorAll(%s)', (selector, ids) => {
    const { document } = page(markup);
    expect(document.querySelectorAll(selector).map((el) => el.id)).toEqual(ids);
  });

  it('matches against the whole tree, returns descendants only, and answers closest and matches', () => {
    const { $ } = page(markup);
    expect($('#s').querySelectorAll('section')).toEqual([]);
    expect($('#s').querySelectorAll('section li').length).toBe(2);
    expect($('#one').closest('section')?.id).toBe('s');
    expect($('#one').closest('li')?.id).toBe('one');
    expect($('#one').matches('ul > li[data-k=alpha]')).toBe(true);
    expect($('#one').matches('ol > li')).toBe(false);
  });

  it.each([':first-child', ':scope > li', 'li:hover', '> li', 'li >', '[unterminated'])('throws on the unsupported selector %s', (selector) => {
    const { document } = page(markup);
    expect(() => document.querySelectorAll(selector)).toThrow(/fake-dom/);
  });
});

describe('fake DOM: tree and text', () => {
  it('textContent reads descendants and replaces children when set', () => {
    const { $ } = page('<p id="p">a<b>b</b>c</p>');
    expect($('#p').textContent).toBe('abc');
    $('#p').textContent = 'x';
    expect($('#p').childNodes).toHaveLength(1);
    $('#p').textContent = '';
    expect($('#p').childNodes).toHaveLength(0);
  });

  it('moves a node that is inserted again, keeps children on replaceChildren, and refuses a cycle', () => {
    const { $, document } = page('<div id="a"><i id="x">x</i><i id="y">y</i></div><div id="b"></div>');
    $('#b').append($('#x'));
    expect($('#a').children.map((el) => el.id)).toEqual(['y']);
    expect($('#b').children.map((el) => el.id)).toEqual(['x']);
    $('#a').replaceChildren($('#y'), 'tail');
    expect($('#a').children.map((el) => el.id)).toEqual(['y']);
    expect($('#a').textContent).toBe('ytail');
    expect(() => $('#a').append($('#a'))).toThrow(/HierarchyRequestError/);
    expect(() => $('#a').append(document.documentElement)).toThrow(/HierarchyRequestError/);
  });

  it('before, after, replaceWith, prepend and insertBefore keep document order', () => {
    const { $ } = page('<ul id="u"><li id="m">m</li></ul>');
    const make = (id: string): FakeElement => {
      const li = $('#u').ownerDocument!.createElement('li');
      li.id = id;
      return li;
    };
    $('#m').before(make('a'));
    $('#m').after(make('z'));
    $('#u').prepend(make('first'));
    $('#u').insertBefore(make('b'), $('#m'));
    expect($('#u').children.map((el) => el.id)).toEqual(['first', 'a', 'b', 'm', 'z']);
    $('#m').replaceWith(make('n'));
    expect($('#u').children.map((el) => el.id)).toEqual(['first', 'a', 'b', 'n', 'z']);
    expect($('#u').contains($('#n'))).toBe(true);
    expect($('#n').contains($('#u'))).toBe(false);
  });

  it('reflects hidden, inert, disabled, id, href and tabIndex through attributes', () => {
    const { $, document } = page('<button id="b">b</button><a id="l">l</a>');
    $('#b').hidden = true;
    expect($('#b').getAttribute('hidden')).toBe('');
    $('#b').hidden = false;
    expect($('#b').hasAttribute('hidden')).toBe(false);
    expect($('#b').tabIndex).toBe(0);
    expect($('#l').tabIndex).toBe(0); // the property defaults to 0 for an <a>, with or without an href...
    $('#l').focus();
    expect(document.activeElement).toBe(document.body); // ...but without one it is not focusable, as in the engines
    $('#l').href = '#x';
    expect($('#l').tabIndex).toBe(0);
    $('#l').focus();
    expect(document.activeElement).toBe($('#l'));
    $('#b').tabIndex = -1;
    expect($('#b').getAttribute('tabindex')).toBe('-1');
  });
});

describe('fake DOM: the parser and the serializer', () => {
  it('decodes character references once, keeps a `>` inside a quoted value, drops comments and the doctype', () => {
    const { $ } = page(
      '<!-- note --><p id="p" title="a > b" data-x=bare>1 &#x3C; 2 &#x26; 3 &#x3E; 0 &amp;lt;</p><img id="i" alt="x"><br><hr id="h">',
    );
    expect($('#p').textContent).toBe('1 < 2 & 3 > 0 &lt;');
    expect($('#p').getAttribute('title')).toBe('a > b');
    expect($('#p').getAttribute('data-x')).toBe('bare');
    expect($('#i').childNodes).toHaveLength(0); // void
    expect($('#h').parentElement?.localName).toBe('body'); // the void elements did not swallow what follows
  });

  it('keeps <pre><code> text, drops only a newline that comes right after <pre>, and treats a stray < as text', () => {
    const { $ } = page('<pre id="a">\nline</pre><pre id="b"><code>\nkept</code></pre><p id="p">1 < 2</p>');
    expect($('#a').textContent).toBe('line');
    expect($('#b').textContent).toBe('\nkept');
    expect($('#p').textContent).toBe('1 < 2');
  });

  it('serializes what it parsed, with text and attributes escaped, so a round trip is stable', () => {
    const { $ } = page('<div id="d" data-q="a&quot;b" title="x > y"><p>x &#x3C; y &#x26; z</p><hr></div>');
    const once = $('#d').outerHTML;
    expect(once).toBe('<div id="d" data-q="a&quot;b" title="x &gt; y"><p>x &lt; y &amp; z</p><hr></div>');
    $('#d').innerHTML = $('#d').innerHTML;
    expect($('#d').outerHTML).toBe(once);
  });

  it('writes the text of a script or a style as it is, and escapes the text of everything else', () => {
    const { $ } = page('<div id="d"><script>if (a < b && c) { x = "</p>"; }</script><style>a > b {}</style><p>a < b && c</p></div>');
    expect($('#d').innerHTML).toBe('<script>if (a < b && c) { x = "</p>"; }</script><style>a > b {}</style><p>a &lt; b &amp;&amp; c</p>');
  });

  it('parses the shell exactly as it is shipped, and the segments the pipeline renders', () => {
    const shell = createBrowser(readFileSync(`${ROOT}workshop/spa/index.html`, 'utf8'));
    const { document } = shell;
    expect(document.getElementById('segment-nav')?.getAttribute('aria-label')).toBe('Segments');
    expect(document.getElementById('main')?.getAttribute('tabindex')).toBe('-1');
    const live = document.getElementById('live-region');
    expect([live?.getAttribute('role'), live?.getAttribute('aria-live'), live?.getAttribute('aria-atomic')]).toEqual(['status', 'polite', 'true']);

    const m1 = loadSegments(ROOT).find((segment) => segment.id === 'm1-extensibility-architecture');
    expect(m1).toBeDefined();
    const scratch = document.createElement('div');
    scratch.innerHTML = (m1 as { html: string }).html;
    const firstList = scratch.querySelector('ul');
    expect(firstList?.children).toHaveLength(6);
    expect(firstList?.children.every((li) => li.firstElementChild?.localName === 'strong')).toBe(true);
    expect(scratch.querySelectorAll('h2').length).toBeGreaterThan(3);
  });
});

describe('fake DOM: the window and the location', () => {
  it('fires hashchange asynchronously, and only for a change; replace changes the fragment too', async () => {
    const { window } = page('');
    let changes = 0;
    window.addEventListener('hashchange', () => (changes += 1));
    window.location.hash = '#/m2-mcp';
    expect(changes).toBe(0); // a browser fires it on a later task
    await Promise.resolve();
    expect([changes, window.location.hash]).toEqual([1, '#/m2-mcp']);
    window.location.hash = '#/m2-mcp';
    await Promise.resolve();
    expect(changes).toBe(1);
    window.location.replace(`${window.location.href.split('#')[0]}#/m3`);
    await Promise.resolve();
    expect([changes, window.location.hash]).toEqual([2, '#/m3']);
  });

  it('follows a link to a fragment on click, unless the click is cancelled', async () => {
    const { $, window } = page('<a id="l" href="#/m2-mcp">l</a><a id="n" href="#/m3" >n</a>');
    $('#n').addEventListener('click', (event) => event.preventDefault());
    $('#l').click();
    expect(window.location.hash).toBe('#/m2-mcp');
    $('#n').click();
    expect(window.location.hash).toBe('#/m2-mcp');
  });
});
