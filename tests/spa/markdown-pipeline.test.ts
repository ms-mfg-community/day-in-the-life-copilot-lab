// AC3 of specs/005-teaching-spa.md (child issue 2, the markdown -> HTML pipeline): HTML built from curriculum markdown
// has no on* event-handler attribute, no <script>, no javascript: URL, and a prefixed id on every heading. The prefix is
// the user-content- clobber prefix of section 2.2 (F138-F144), which stops DOM clobbering.
// Observable: npx vitest run tests/spa/markdown-pipeline.test.ts
//
// A sanitizer tested only on clean input is untested, so this file attacks the pipeline from three sides:
//   1. hostile markdown: the inline <script>, onclick attribute, javascript: href, DOM-property id and colliding heading
//      slugs that an author, or a snippet pasted from the web, could carry;
//   2. hostile nodes injected at the processor's plugin seam. remark-rehype drops raw HTML (F136, F137), so markdown
//      alone never hands the sanitizer anything dangerous; a plugin can. Each injection is paired with a control chain
//      that leaves the sanitizer out: if the control were clean the input was not hostile, and a green production
//      result would prove nothing;
//   3. hostile front matter: gray-matter's javascript engine evals the block, so the pipeline must refuse it (F147).
// HTML is judged with the scanner in helpers/html-scan.ts, never with a whole-string regex (see its header). The
// scanner has a self-test first, because an oracle that cannot fail proves nothing.

import matter from 'gray-matter';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import type { PluggableList } from 'unified';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { curriculumFiles, diskTree } from './helpers/frontmatter-keys';
import {
  ac3Violations,
  attributeValues,
  decodeOnce,
  duplicateIds,
  headingIds,
  scanTags,
  schemeOf,
} from './helpers/html-scan';
import {
  CLOBBER_PREFIX,
  installHashRewrite,
  prefixedIdForHash,
  scrollToHash,
} from '../../workshop/spa/src/content/hash-rewrite';
import type {
  HashClickEvent,
  HashDocument,
  HashWindow,
  ScrollTarget,
} from '../../workshop/spa/src/content/hash-rewrite';
import { createProcessor, renderMarkdown } from '../../workshop/spa/src/content/markdown';

const ROOT = process.cwd();

/** Render with the production pipeline; only the HTML. */
const render = (markdown: string): string => renderMarkdown(markdown).html;

/** What rehype-slug then rehype-sanitize make of a heading's slug: the prefix, applied once. */
const prefixed = (slug: string): string => `user-content-${slug}`;

/** The same text with Windows line endings. The curriculum is CRLF in a Windows checkout and LF in CI. */
const crlf = (text: string): string => text.replace(/\n/g, '\r\n');

/** A syntax-tree node, hast or mdast, just detailed enough to build hostile ones. The processor sees plain objects. */
interface TreeNode {
  type: string;
  [key: string]: unknown;
}

const el = (tagName: string, properties: Record<string, unknown>, ...children: TreeNode[]): TreeNode => ({
  type: 'element',
  tagName,
  properties,
  children,
});

const text = (value: string): TreeNode => ({ type: 'text', value });

/** A plugin that appends `nodes` to the root of whichever tree it is given: mdast in a remark slot, hast in a rehype one. */
const appendNodes = (nodes: TreeNode[]) => () => (tree: unknown) => {
  (tree as { children: unknown[] }).children.push(...nodes);
};

interface Extra {
  remark?: PluggableList;
  rehype?: PluggableList;
}

/** The production chain, with extra plugins at its seam. */
const renderWith = (markdown: string, extra: Extra): string =>
  String(createProcessor({ extraRemarkPlugins: extra.remark, extraRehypePlugins: extra.rehype }).processSync(markdown));

/**
 * The control: the production chain with the sanitizer taken out and raw HTML switched on. It exists only in this
 * file; production code has no way to build it. It shows that hostile input really is hostile, so that a clean
 * result from the production chain means the sanitizer worked rather than that the input was harmless.
 */
const renderUnsanitized = (markdown: string, extra: Extra): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkFrontmatter, ['yaml'])
      .use(extra.remark ?? [])
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(extra.rehype ?? [])
      .use(rehypeSlug)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(markdown),
  );

describe('html-scan oracle (self-test)', () => {
  const MUST_FLAG: Array<{ name: string; html: string; flagged: RegExp }> = [
    { name: 'a script element', html: '<p>x</p><script>alert(1)</script>', flagged: /<script> element/ },
    { name: 'an upper-case SCRIPT', html: '<SCRIPT SRC=//evil.test/x.js></SCRIPT>', flagged: /<script> element/ },
    { name: 'onclick', html: '<p onclick="x">t</p>', flagged: /"onclick"/ },
    { name: 'on* after a quoted ">"', html: '<p title="a>b" onclick="x">t</p>', flagged: /"onclick"/ },
    { name: 'an unquoted on*', html: '<img src=x onerror=y>', flagged: /"onerror"/ },
    { name: 'a mixed-case on*', html: '<p OnMouseOver=x>t</p>', flagged: /"onmouseover"/ },
    { name: 'a javascript: href', html: '<a href="javascript:alert(1)">x</a>', flagged: /javascript: URL in "href"/ },
    {
      name: 'a javascript: href behind a space and an entity',
      html: '<a href=" java&#x73;cript:alert(1)">x</a>',
      flagged: /javascript: URL/,
    },
    {
      name: 'a javascript: href split by an entity tab',
      html: '<a href="jav&#x09;ascript:alert(1)">x</a>',
      flagged: /javascript: URL/,
    },
    { name: 'a javascript: src', html: '<img src="javascript:alert(1)">', flagged: /javascript: URL in "src"/ },
    {
      name: 'a scheme outside the allowlist',
      html: '<a href="data:text/html,x">x</a>',
      flagged: /scheme "data:" not allowed/,
    },
    { name: 'a heading with no id', html: '<h2>x</h2>', flagged: /<h2> has no id/ },
    { name: 'a heading id without the prefix', html: '<h1 id="intro">x</h1>', flagged: /lacks the user-content- prefix/ },
    { name: 'an unprefixed id on a paragraph', html: '<p id="cookie">x</p>', flagged: /"id" value "cookie"/ },
    { name: 'an unprefixed name', html: '<img name="cookie">', flagged: /"name" value "cookie"/ },
    {
      name: 'an unprefixed aria reference',
      html: '<p aria-labelledby="cookie">x</p>',
      flagged: /"aria-labelledby" value "cookie"/,
    },
  ];

  it.each(MUST_FLAG)('flags $name', ({ html, flagged }) => {
    expect(ac3Violations(html).join('\n')).toMatch(flagged);
  });

  const MUST_PASS: Array<{ name: string; html: string }> = [
    { name: 'escaped <script> text', html: '<p>&#x3C;script>alert(1)&#x3C;/script></p>' },
    { name: 'on* spelled out inside text', html: '<p><code>onclick="x"</code></p>' },
    { name: '<script> inside a quoted attribute value', html: '<p><img src="a.png" alt="<script>x</script>"></p>' },
    { name: 'a ">" inside a single-quoted value', html: "<p><a href='#x' title='a>b'>t</a></p>" },
    { name: 'a lone "<" and a "<3" in text', html: '<p>1 < 2 and I <3 you</p>' },
    {
      name: 'an href that is relative after ONE decode',
      html: '<p><a href="jav&#x26;#x09;ascript:alert(7)">x</a></p>',
    },
    {
      name: 'safe links',
      html: '<p><a href="#x">a</a> <a href="./x.md">b</a> <a href="mailto:a@b.c">c</a> <a href="https://example.com">d</a></p>',
    },
    { name: 'prefixed ids and names', html: '<h1 id="user-content-a">A</h1><a name="user-content-b" id="user-content-c"></a>' },
  ];

  it.each(MUST_PASS)('does not flag $name', ({ html }) => {
    expect(ac3Violations(html)).toEqual([]);
  });

  it('decodes character references exactly once, and only the ones it knows', () => {
    expect(decodeOnce('&#x6A;ava&#115;cript&colon;')).toBe('javascript:');
    expect(decodeOnce('&#x6A')).toBe('j'); // numeric references decode without the closing semicolon
    expect(decodeOnce('jav&#x26;#x09;ascript')).toBe('jav&#x09;ascript'); // one pass: the result is not decoded again
    expect(decodeOnce('&constructor;')).toBe('&constructor;'); // a Map lookup, not an object property lookup
    expect(decodeOnce('&#0;&#xD800;&#x110000;')).toBe('\uFFFD\uFFFD\uFFFD');
  });

  it('finds the scheme the way a URL parser does', () => {
    expect(schemeOf('HTTPS://example.com')).toBe('https');
    expect(schemeOf(' \tjava\nscript:alert(1)')).toBe('javascript');
    expect(schemeOf('mailto:a@b.c')).toBe('mailto');
    for (const relative of ['./x.md', 'x.md', '#frag', '//host/x', 'jav&#x09;ascript:x']) {
      expect(schemeOf(relative)).toBeUndefined();
    }
  });

  it('reads start and end tags, quoted values that hold ">", and bare attributes', () => {
    expect(scanTags(`<p class="a>b" data-x='1' hidden>t</p><br/>`)).toEqual([
      {
        name: 'p',
        closing: false,
        attributes: [
          { name: 'class', value: 'a>b' },
          { name: 'data-x', value: '1' },
          { name: 'hidden', value: '' },
        ],
      },
      { name: 'p', closing: true, attributes: [] },
      { name: 'br', closing: false, attributes: [] },
    ]);
  });

  it('lists heading ids, attribute values and repeated ids', () => {
    expect(headingIds('<h1 id="user-content-a">A</h1><h2>B</h2>')).toEqual(['user-content-a', undefined]);
    expect(attributeValues('<a href="#x">a</a><a href="#y">b</a><a>c</a>', 'a', 'href')).toEqual(['#x', '#y']);
    expect(duplicateIds('<p id="a"></p><p id="b"></p><p id="a"></p><p id="a"></p>')).toEqual(['a']);
  });
});

describe('markdown pipeline: happy path', () => {
  it('gives a heading its id with the user-content- prefix, applied exactly once', () => {
    expect(render('# Hello World')).toBe('<h1 id="user-content-hello-world">Hello World</h1>');
  });

  it('uses the prefix the hash rewrite looks for', () => {
    expect(CLOBBER_PREFIX).toBe('user-content-');
    expect(headingIds(render('## Intro'))).toEqual([`${CLOBBER_PREFIX}intro`]);
  });

  it('keeps what a sanitizer must keep: safe links, images, code fences', () => {
    const markdown = [
      '[a](./x.md) [b](https://example.com) [c](mailto:a@b.c) [d](#frag)',
      '',
      '![alt text](x.png)',
      '',
      '```ts',
      'const x = 1;',
      '```',
    ].join('\n');
    const html = render(markdown);
    expect(attributeValues(html, 'a', 'href')).toEqual(['./x.md', 'https://example.com', 'mailto:a@b.c', '#frag']);
    expect(attributeValues(html, 'img', 'src')).toEqual(['x.png']);
    expect(attributeValues(html, 'code', 'class')).toEqual(['language-ts']);
    expect(ac3Violations(html)).toEqual([]);
  });

  it('does not rewrite an in-page link, which is why the hash rewrite has to ship (F143, F144)', () => {
    const html = render('# Intro\n\n[see](#intro)');
    expect(attributeValues(html, 'a', 'href')).toEqual(['#intro']);
    expect(headingIds(html)).toEqual(['user-content-intro']);
  });

  it('returns the parsed front matter beside the html', () => {
    expect(renderMarkdown('---\ntitle: X\n---\n\n# Body')).toEqual({
      data: { title: 'X' },
      html: '<h1 id="user-content-body">Body</h1>',
    });
  });

  it('carries no state from one document to the next', () => {
    const markdown = '# A\n\n# A';
    expect(headingIds(render(markdown))).toEqual(['user-content-a', 'user-content-a-1']);
    expect(render(markdown)).toBe(render(markdown));
  });
});

describe('markdown pipeline: every heading gets a prefixed id, wherever it sits', () => {
  // AC3 says every heading, not every top-level one. These pin that: headings inside containers, with inline markup in
  // them, at all six levels, and in the setext style. Each is checked against the exact ids and against the AC3 scan.
  const PLACEMENTS: Array<{ name: string; markdown: string; ids: string[] }> = [
    { name: 'in a blockquote', markdown: '> # Quoted heading', ids: ['user-content-quoted-heading'] },
    { name: 'in a list item', markdown: '- # Item heading\n\n  text', ids: ['user-content-item-heading'] },
    { name: 'in a blockquote in a list in a blockquote', markdown: '> - > ## Deep', ids: ['user-content-deep'] },
    {
      name: 'in an ordered list with a nested one',
      markdown: '1. ### Step one\n   - #### Sub',
      ids: ['user-content-step-one', 'user-content-sub'],
    },
    {
      name: 'with emphasis, code and a link in it',
      markdown: '# A *b* `c` [d](https://example.com)',
      ids: ['user-content-a-b-c-d'],
    },
    {
      name: 'in the setext style',
      markdown: 'Setext\n======\n\nSub\n---',
      ids: ['user-content-setext', 'user-content-sub'],
    },
    {
      name: 'at each of the six levels',
      markdown: '# a\n## b\n### c\n#### d\n##### e\n###### f',
      ids: ['a', 'b', 'c', 'd', 'e', 'f'].map((slug) => `user-content-${slug}`),
    },
    {
      name: 'with closing hashes or trailing spaces',
      markdown: '## Closed ##\n\n# Spaced   ',
      ids: ['user-content-closed', 'user-content-spaced'],
    },
    {
      name: 'with accents, CJK and punctuation',
      markdown: '# Überblick und 日本語\n\n# What is this? (A test: 1.2.3)',
      ids: ['user-content-überblick-und-日本語', 'user-content-what-is-this-a-test-123'],
    },
  ];

  it.each(PLACEMENTS)('puts a prefixed id on a heading $name', ({ markdown, ids }) => {
    const html = render(markdown);
    expect(headingIds(html)).toEqual(ids);
    expect(ac3Violations(html)).toEqual([]);
  });

  it('treats seven hashes, or a hash with no space after it, as text rather than as a heading', () => {
    expect(headingIds(render('####### seven\n\n#nospace'))).toEqual([]);
  });
});

describe('markdown pipeline: hostile raw HTML', () => {
  // remark-rehype drops raw HTML (F136, F137), so these prove that raw HTML never becomes an element. They do not
  // prove the sanitizer works; the injection tests below do. Text between dropped tags survives as harmless text, so
  // "alert(1)" appearing in the output is not a failure; only an element or an attribute is.
  const HOSTILE_MARKDOWN: Array<{ name: string; markdown: string }> = [
    { name: 'an inline <script>', markdown: 'before <script>alert(1)</script> after' },
    { name: 'a <script> block', markdown: '<script>alert(1)</script>\n\nafter' },
    { name: 'a <script> with a src', markdown: '<script src="https://evil.test/x.js"></script>\n\nafter' },
    { name: 'a mixed-case <ScRiPt>', markdown: 'x <ScRiPt>alert(1)</sCrIpT> y' },
    { name: 'a <script> behind a "<!-->" comment opener', markdown: '<!--><script>alert(1)</script>-->\n\nafter' },
    { name: 'a <script> inside a heading', markdown: '# Hi <script>alert(1)</script> there' },
    {
      name: 'tags that reassemble into <script> once the inner tags are removed',
      markdown: 'x <scr<script>ipt>alert(1)</scr</script>ipt> y',
    },
    { name: 'an onclick on a block element', markdown: '<div onclick="alert(1)">hi</div>\n\nafter' },
    { name: 'an upper-case ONCLICK', markdown: '<DIV ONCLICK="alert(1)">hi</DIV>\n\nafter' },
    { name: 'an onclick on an inline element', markdown: 'x <b onclick="alert(1)">bold</b> y' },
    { name: 'an onclick inside a heading', markdown: '# Hi <b onclick="alert(1)">bold</b> there' },
    { name: 'an onerror on an inline image', markdown: 'x <img src=x onerror=alert(1)> y' },
    { name: 'an onload on an svg', markdown: '<svg onload=alert(1)>\n\nafter' },
    { name: 'a raw javascript: href', markdown: 'x <a href="javascript:alert(1)">click</a> y' },
    { name: 'a raw javascript: iframe', markdown: '<iframe src="javascript:alert(1)"></iframe>\n\nafter' },
    { name: 'a javascript: form action', markdown: '<form action="javascript:alert(1)"><input name="x"></form>\n\nafter' },
    {
      name: 'a meta refresh to javascript:',
      markdown: '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">\n\nafter',
    },
    { name: 'a <style> block', markdown: '<style>body{background:url("javascript:alert(1)")}</style>\n\nafter' },
    { name: 'an inline element with a DOM-property id and name', markdown: 'x <a id="cookie" name="cookie">y</a> z' },
    { name: 'a block element with a DOM-property id and name', markdown: '<form id="location" name="cookie"></form>\n\nafter' },
    { name: 'a <script> inside an image alt', markdown: '![<script>alert(1)</script>](x.png)' },
    {
      name: 'raw HTML in link text and a <script> in the link title',
      markdown: '[<b onclick="x">t</b>](https://example.com "<script>x</script>")',
    },
  ];

  it.each(HOSTILE_MARKDOWN)('has no AC3 violation for $name', ({ markdown }) => {
    expect(ac3Violations(render(markdown))).toEqual([]);
  });

  it('turns an inline <script> into text, not an element', () => {
    const html = render('before <script>alert(1)</script> after');
    expect(scanTags(html).some((tag) => tag.name === 'script')).toBe(false);
    expect(html).toBe('<p>before alert(1) after</p>');
  });

  it('leaves no trace of a raw HTML block: remark-rehype drops it before the sanitizer sees it (F136)', () => {
    // With `allowDangerousHtml` on, the block would reach the sanitizer as a hast raw node and the sanitizer would drop
    // it as well, so the AC3 scan cannot tell "raw HTML off" from "raw HTML on, then sanitized". The tell is the blank
    // line that a dropped raw node leaves behind in the wrapped output; F136 says raw HTML is off, so there is none.
    expect(render('<div onclick="alert(1)">hi</div>\n\nafter')).toBe('<p>after</p>');
    expect(render('<script>alert(1)</script>\n\nafter')).toBe('<p>after</p>');
    expect(render('before\n\n<!-- c -->\n\nafter')).toBe('<p>before</p>\n<p>after</p>');
    expect(render('# H\n\n<script>alert(1)</script>\n\ntext')).toBe('<h1 id="user-content-h">H</h1>\n<p>text</p>');
  });

  it('keeps a literal <script> inside an alt attribute as inert quoted text, and the scanner agrees', () => {
    const html = render('![<script>alert(1)</script>](x.png)');
    expect(attributeValues(html, 'img', 'alt')).toEqual(['<script>alert(1)</script>']);
    expect(scanTags(html).map((tag) => tag.name)).toEqual(['p', 'img', 'p']);
  });
});

describe('markdown pipeline: javascript: and other URL schemes in markdown links', () => {
  // Unlike raw HTML, these reach the sanitizer: markdown links become <a href> elements before it runs.
  const HOSTILE_LINKS: Array<{ name: string; markdown: string }> = [
    { name: 'javascript:', markdown: '[x](javascript:alert(1))' },
    { name: 'JaVaScRiPt:', markdown: '[x](JaVaScRiPt:alert(1))' },
    { name: 'a decimal-entity j', markdown: '[x](&#106;avascript:alert(1))' },
    { name: 'a hex-entity j', markdown: '[x](&#x6A;avascript:alert(1))' },
    { name: 'an entity tab inside the scheme', markdown: '[x](jav&#x09;ascript:alert(1))' },
    { name: 'an entity colon', markdown: '[x](javascript&colon;alert(1))' },
    { name: 'an angle-bracketed destination', markdown: '[x](<javascript:alert(1)>)' },
    { name: 'an image', markdown: '![x](javascript:alert(1))' },
    { name: 'a reference definition', markdown: '[x]\n\n[x]: javascript:alert(1)' },
    { name: 'an autolink', markdown: '<javascript:alert(1)>' },
    { name: 'a data: URL', markdown: '[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)' },
    { name: 'a vbscript: URL', markdown: '[x](vbscript:msgbox(1))' },
  ];

  it.each(HOSTILE_LINKS)('removes the href for $name', ({ markdown }) => {
    const html = render(markdown);
    expect(ac3Violations(html)).toEqual([]);
    expect(attributeValues(html, 'a', 'href')).toEqual([]);
    expect(attributeValues(html, 'img', 'src')).toEqual([]);
  });

  it('keeps the link text and drops only the href', () => {
    expect(render('[x](javascript:alert(1))')).toBe('<p><a>x</a></p>');
  });

  it('leaves the text of a javascript: autolink behind, so scanning the whole string would false-alarm', () => {
    const html = render('<javascript:alert(1)>');
    expect(html).toContain('javascript:alert(1)');
    expect(attributeValues(html, 'a', 'href')).toEqual([]);
    expect(ac3Violations(html)).toEqual([]);
  });

  it('keeps javascript: that is only link text, because text is not an attribute', () => {
    const html = render('[&#x6A;avascript:alert(1)](#x)');
    expect(attributeValues(html, 'a', 'href')).toEqual(['#x']);
    expect(html).toContain('javascript:alert(1)');
    expect(ac3Violations(html)).toEqual([]);
  });
});

describe('markdown pipeline: hostile nodes injected at the plugin seam, against an unsanitized control', () => {
  // The production chain is createProcessor() with extra plugins at its seam: remark plugins run before
  // remark-rehype, rehype plugins after it and before rehype-slug. rehype-sanitize and rehype-stringify come last, so
  // nothing a plugin does can reach the output except through the sanitizer.
  //
  // Not asserted here: id uniqueness when a plugin presets a heading id. rehype-slug does not register ids that
  // already exist, so an injected <h2 id="intro"> ahead of a markdown "# Intro" yields two user-content-intro.
  // Markdown cannot preset a heading id, so that is unreachable from curriculum content; it is a note for any later
  // heading-id plugin, not a sanitizer defect. The duplicate-heading tests below cover plain markdown.

  const HOSTILE_ELEMENTS: TreeNode[] = [
    el(
      'p',
      {
        onclick: 'alert(1)',
        onClick: 'alert(2)',
        onMouseOver: 'alert(3)',
        style: 'x',
        href: 'javascript:alert(4)',
        id: 'cookie',
        name: 'cookie',
      },
      text('hello'),
    ),
    el('script', {}, text('alert(5)')),
    el('a', { href: 'javascript:alert(6)', onmouseover: 'x', id: 'location' }, text('lnk')),
    el('a', { href: '  JaVaScRiPt:alert(7)' }, text('spaced')),
    el('a', { href: 'jav&#x09;ascript:alert(8)' }, text('encoded')),
    el('img', { src: 'javascript:alert(9)', onerror: 'alert(10)', name: 'cookie', alt: 'i' }),
    el('iframe', { src: 'javascript:alert(11)' }),
    el('h2', { id: 'location' }, text('Injected id')),
    el('h3', {}, text('Injected no id')),
    el('p', { ariaLabelledBy: 'cookie', ariaDescribedBy: 'location other' }, text('aria')),
    el('form', { action: 'javascript:alert(12)' }, el('input', { name: 'x' })),
    el('a', { href: 'data:text/html,<script>alert(13)</script>' }, text('data')),
    el('a', { href: 'https://example.com/ok' }, text('ok')),
  ];

  it('a rehype plugin cannot get hostile elements past the sanitizer', () => {
    const inject = appendNodes(HOSTILE_ELEMENTS);

    const control = ac3Violations(renderUnsanitized('seed', { rehype: [inject] })).join('\n');
    expect(control).toMatch(/<script> element/);
    expect(control).toMatch(/event-handler attribute "onclick"/);
    expect(control).toMatch(/event-handler attribute "onmouseover"/);
    expect(control).toMatch(/event-handler attribute "onerror"/);
    expect(control).toMatch(/javascript: URL in "href"/);
    expect(control).toMatch(/javascript: URL in "src"/);
    expect(control).toMatch(/"id" value "cookie" .* lacks the user-content- prefix/);
    expect(control).toMatch(/<h3> .*lacks the user-content- prefix/); // rehype-slug adds an id, but not the prefix

    const html = renderWith('seed', { rehype: [inject] });
    expect(ac3Violations(html)).toEqual([]);
    const names = scanTags(html).map((tag) => tag.name);
    for (const gone of ['script', 'iframe', 'form']) expect(names).not.toContain(gone);
  });

  it('prefixes the ids and names of injected elements, whatever DOM property they name', () => {
    const html = renderWith('seed', { rehype: [appendNodes(HOSTILE_ELEMENTS)] });
    expect(attributeValues(html, 'p', 'id')).toEqual(['user-content-cookie']);
    expect(attributeValues(html, 'p', 'name')).toEqual(['user-content-cookie']);
    expect(attributeValues(html, 'a', 'id')).toEqual(['user-content-location']);
    expect(attributeValues(html, 'img', 'name')).toEqual(['user-content-cookie']);
    expect(headingIds(html)).toEqual(['user-content-location', 'user-content-injected-no-id']);
  });

  it('leaves no href on an injected link except a relative one and an allowed scheme', () => {
    const html = renderWith('seed', { rehype: [appendNodes(HOSTILE_ELEMENTS)] });
    const schemes = attributeValues(html, 'a', 'href').map(schemeOf);
    expect(schemes.every((scheme) => scheme === undefined || scheme === 'https')).toBe(true);
    expect(attributeValues(html, 'a', 'href')).toContain('https://example.com/ok');
  });

  it('a value cannot break out of its quotes to plant an attribute', () => {
    const inject = appendNodes([el('p', { id: 'x" onclick="alert(1)', title: '"><script>alert(2)</script>' }, text('t'))]);
    const html = renderWith('seed', { rehype: [inject] });
    expect(ac3Violations(html)).toEqual([]);
    expect(attributeValues(html, 'p', 'id')).toEqual(['user-content-x" onclick="alert(1)']);
  });

  it('a hast raw node is dropped, not written out', () => {
    const inject = appendNodes([{ type: 'raw', value: '<script>alert(1)</script><img src=x onerror=alert(2)>' }]);
    const control = ac3Violations(renderUnsanitized('seed', { rehype: [inject] })).join('\n');
    expect(control).toMatch(/<script> element/);
    expect(control).toMatch(/"onerror"/);
    expect(renderWith('seed', { rehype: [inject] })).toBe('<p>seed</p>');
  });

  it('a remark plugin cannot either: mdast html nodes, javascript: links and images, hProperties, hName', () => {
    const inject = appendNodes([
      { type: 'html', value: '<script>alert(1)</script>' },
      { type: 'paragraph', children: [{ type: 'link', url: 'javascript:alert(2)', children: [text('lnk')] }] },
      { type: 'paragraph', children: [{ type: 'image', url: 'javascript:alert(3)', alt: 'img' }] },
      {
        type: 'paragraph',
        children: [
          { type: 'link', url: '#x', data: { hProperties: { onclick: 'alert(4)' } }, children: [text('props')] },
        ],
      },
      { type: 'paragraph', data: { hName: 'script' }, children: [text('alert(5)')] },
    ]);

    const control = ac3Violations(renderUnsanitized('seed', { remark: [inject] })).join('\n');
    expect(control).toMatch(/<script> element/);
    expect(control).toMatch(/javascript: URL in "href"/);
    expect(control).toMatch(/javascript: URL in "src"/);
    expect(control).toMatch(/event-handler attribute "onclick"/);

    const html = renderWith('seed', { remark: [inject] });
    expect(ac3Violations(html)).toEqual([]);
    expect(scanTags(html).some((tag) => tag.name === 'script')).toBe(false);
  });

  it('keeps the sanitizer after every plugin, including one that adds hostile nodes and then a heading', () => {
    const inject = appendNodes([el('h2', {}, text('Late heading')), el('img', { src: 'javascript:x', onerror: 'y' })]);
    const html = renderWith('# First', { remark: [], rehype: [inject] });
    expect(headingIds(html)).toEqual(['user-content-first', 'user-content-late-heading']);
    expect(ac3Violations(html)).toEqual([]);
  });
});

describe('markdown pipeline: ids that collide with DOM property names', () => {
  // `<img name="cookie">` replaces document.cookie and `<a id="location">` can shadow a global, which is what the
  // user-content- prefix prevents. A bare "cookie", "location" or "constructor" must never be an id or a name.
  const DOM_NAMES = ['cookie', 'location', 'document', 'getElementById', 'constructor', 'hasOwnProperty', 'toString'];

  it.each(DOM_NAMES)('a heading "%s" gets the prefixed slug and nothing bare', (name) => {
    const html = render(`# ${name}`);
    expect(headingIds(html)).toEqual([prefixed(name.toLowerCase())]);
    expect(ac3Violations(html)).toEqual([]);
  });

  it.each(DOM_NAMES)('two headings "%s" are suffixed, not merged', (name) => {
    const slug = name.toLowerCase();
    expect(headingIds(render(`# ${name}\n\n# ${name}`))).toEqual([prefixed(slug), prefixed(`${slug}-1`)]);
  });

  it('never leaves a DOM property name bare as an id or a name anywhere in the output', () => {
    const markdown = DOM_NAMES.map((name) => `## ${name}`).join('\n\n');
    const html = renderWith(`${markdown}\n\nx <a id="cookie" name="cookie">y</a>`, {
      rehype: [appendNodes([el('img', { name: 'cookie' }), el('form', { id: 'location', name: 'document' })])],
    });
    const bare = scanTags(html)
      .flatMap((tag) => tag.attributes)
      .filter((attribute) => attribute.name === 'id' || attribute.name === 'name')
      .map((attribute) => attribute.value.toLowerCase())
      .filter((value) => DOM_NAMES.some((name) => name.toLowerCase() === value));
    expect(bare).toEqual([]);
    expect(ac3Violations(html)).toEqual([]);
  });

  it('a heading spelled __proto__ is an ordinary id, and a second one is suffixed', () => {
    // In markdown, "__proto__" is bold, so the literal text takes an escape or a code span.
    const html = render('# \\_\\_proto\\_\\_\n\n# `__proto__`');
    expect(headingIds(html)).toEqual(['user-content-__proto__', 'user-content-__proto__-1']);
    expect(ac3Violations(html)).toEqual([]);
  });

  it('author-supplied id syntax is only text: an author cannot choose a heading id from markdown', () => {
    expect(headingIds(render('# Title {#cookie}'))).toEqual(['user-content-title-cookie']);
  });
});

describe('markdown pipeline: duplicate headings that would collide on a slug', () => {
  const DUPLICATES: Array<{ name: string; markdown: string; slugs: string[] }> = [
    { name: 'the same heading three times', markdown: '# Intro\n\n# Intro\n\n# Intro', slugs: ['intro', 'intro-1', 'intro-2'] },
    {
      name: 'a heading that looks like a generated suffix',
      markdown: '# Intro\n\n# Intro\n\n# Intro 1\n\n# Intro\n\n## intro-1',
      slugs: ['intro', 'intro-1', 'intro-1-1', 'intro-2', 'intro-1-2'],
    },
    {
      name: 'punctuation and case that slug to the same text',
      markdown: '# Hello, World!\n\n# Hello World\n\n# hello-world',
      slugs: ['hello-world', 'hello-world-1', 'hello-world-2'],
    },
    {
      name: 'suffix-shaped headings, twice',
      markdown: '# a\n\n# a-1\n\n# a\n\n# a-1',
      slugs: ['a', 'a-1', 'a-2', 'a-1-1'],
    },
    {
      name: 'headings that slug to nothing',
      markdown: '# !!!\n\n# 🎉\n\n# ???',
      slugs: ['', '-1', '-2'],
    },
    {
      name: 'setext and ATX headings together',
      markdown: 'Title\n=====\n\n## Title\n\nTitle\n-----',
      slugs: ['title', 'title-1', 'title-2'],
    },
    {
      name: 'the same text at every level',
      markdown: ['#', '##', '###', '####', '#####', '######'].map((hashes) => `${hashes} Same`).join('\n\n'),
      slugs: ['same', 'same-1', 'same-2', 'same-3', 'same-4', 'same-5'],
    },
  ];

  it.each(DUPLICATES)('gives $name distinct, prefixed ids', ({ markdown, slugs }) => {
    const html = render(markdown);
    expect(headingIds(html)).toEqual(slugs.map(prefixed));
    expect(duplicateIds(html)).toEqual([]);
    expect(ac3Violations(html)).toEqual([]);
  });

  it('gives 200 identical headings 200 distinct ids', () => {
    const html = render(Array.from({ length: 200 }, () => '# Same').join('\n\n'));
    const ids = headingIds(html);
    expect(new Set(ids).size).toBe(200);
    expect(ids[0]).toBe('user-content-same');
    expect(ids[199]).toBe('user-content-same-199');
    expect(duplicateIds(html)).toEqual([]);
  });

  // Ids are unique within one document only: rehype-slug starts again for each tree. Two rendered documents on one
  // page would both carry user-content-intro, so the shell has to mount one at a time (child issue 3).
});

describe('markdown pipeline: front matter', () => {
  // The two line endings matter: this checkout is CRLF on Windows and CI is LF.
  const LINE_ENDINGS: Array<{ name: string; convert: (text: string) => string }> = [
    { name: 'LF', convert: (value) => value },
    { name: 'CRLF', convert: crlf },
  ];

  describe.each(LINE_ENDINGS)('with $name line endings', ({ convert }) => {
    it('returns the data and never renders the block', () => {
      const { data, html } = renderMarkdown(convert('---\ntitle: X\ntags: [a, b]\n---\n\n# Body\n\ntext'));
      expect(data).toEqual({ title: 'X', tags: ['a', 'b'] });
      expect(headingIds(html)).toEqual(['user-content-body']);
      expect(html).not.toContain('title');
      expect(html).not.toContain('tags');
    });

    it('treats an empty block as empty data', () => {
      const { data, html } = renderMarkdown(convert('---\n---\n\n# B'));
      expect(data).toEqual({});
      expect(headingIds(html)).toEqual(['user-content-b']);
    });

    it('treats a comment-only block as empty data', () => {
      const { data, html } = renderMarkdown(convert('---\n# only a comment\n---\n\n# B'));
      expect(data).toEqual({});
      expect(headingIds(html)).toEqual(['user-content-b']);
    });

    it('renders nothing for a document that is only front matter', () => {
      expect(renderMarkdown(convert('---\ntitle: X\n---'))).toEqual({ data: { title: 'X' }, html: '' });
    });

    it('does not treat a later --- block as front matter: remark-frontmatter runs without `anywhere` (F135)', () => {
      const { data, html } = renderMarkdown(convert('# A\n\n---\ntitle: X\n---\n\ntext'));
      expect(data).toEqual({});
      // The block is content: its first line is read as a setext heading, not swallowed as metadata.
      expect(headingIds(html)).toEqual(['user-content-a', 'user-content-title-x']);
    });

    it('does not leak front matter when the closing fence is malformed', () => {
      const { html } = renderMarkdown(convert('---\ntitle: X\n----\n\n# B\n\n---\n\nz'));
      expect(html).not.toContain('title');
      expect(ac3Violations(html)).toEqual([]);
    });
  });

  it('reads JSON front matter, which gray-matter supports out of the box (F147)', () => {
    expect(renderMarkdown('---json\n{"title":"x"}\n---\n\n# B').data).toEqual({ title: 'x' });
  });

  it('keeps a hostile value in data and out of the html: data is untrusted, a consumer must escape it', () => {
    const { data, html } = renderMarkdown('---\ntitle: "<script>alert(1)</script>"\n---\n\n# Body');
    expect(data).toEqual({ title: '<script>alert(1)</script>' });
    expect(html).toBe('<h1 id="user-content-body">Body</h1>');
  });

  it('does not coerce data: a scalar or a list passes through for the curriculum validator to reject', () => {
    expect(renderMarkdown('---\njust some text\n---\n\n# B').data).toBe('just some text');
    expect(renderMarkdown('---\n- a\n- b\n---\n\n# B').data).toEqual(['a', 'b']);
  });

  it('keeps a __proto__ key as data without polluting any prototype', () => {
    const { data } = renderMarkdown('---\n__proto__:\n  polluted: yes\ntitle: X\n---\n\n# B');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
    expect(data).toMatchObject({ title: 'X' });
  });

  it('strips a byte-order mark before the fence', () => {
    const { data, html } = renderMarkdown('\ufeff---\ntitle: X\n---\n\n# B');
    expect(data).toEqual({ title: 'X' });
    expect(headingIds(html)).toEqual(['user-content-b']);
  });

  it('needs the fence at the very start: a leading blank line makes it content', () => {
    const { data, html } = renderMarkdown('\n---\ntitle: X\n---\n\n# B');
    expect(data).toEqual({});
    expect(headingIds(html)).toEqual(['user-content-title-x', 'user-content-b']);
  });

  it('renders an empty or blank document as an empty string', () => {
    expect(renderMarkdown('')).toEqual({ data: {}, html: '' });
    expect(renderMarkdown('  \n\n').html).toBe('');
  });

  it('fails closed on an unterminated fence: the rest of the file is front matter and nothing is rendered', () => {
    const { data, html } = renderMarkdown('---\ntitle: X\n\n# B');
    expect(data).toEqual({ title: 'X' });
    expect(html).toBe('');
  });
});

describe('markdown pipeline: front-matter engines cannot execute code', () => {
  // gray-matter's javascript engine runs the block with eval() (F147 says it parses JavaScript out of the box), and a
  // fence of `---js` or `---javascript` selects it. The canary is a harmless global that the block sets if it runs.
  const CANARY = '__spa02Canary';
  const globals = globalThis as Record<string, unknown>;
  const jsFence = (language: string): string => `---${language}\n(globalThis.${CANARY} = 1, { title: 'x' })\n---\n\n# Body`;

  afterEach(() => {
    delete globals[CANARY];
  });

  it('control: gray-matter with its default engines DOES run a ---js block, so the canary means something', () => {
    expect(matter(jsFence('js'), {}).data).toEqual({ title: 'x' });
    expect(globals[CANARY]).toBe(1);
  });

  it.each(['js', 'javascript', 'JS', 'JavaScript'])('refuses a ---%s block and never runs it', (language) => {
    expect(() => renderMarkdown(jsFence(language))).toThrow(/JavaScript/);
    expect(globals[CANARY]).toBeUndefined();
  });

  it('refuses a language the pipeline has not registered, rather than guessing', () => {
    expect(() => renderMarkdown('---toml\ntitle = "x"\n---\n\n# B')).toThrow();
    expect(() => renderMarkdown('---coffee\ntitle: x\n---\n\n# B')).toThrow();
  });

  it('refuses a YAML tag that would build a function (js-yaml safe schema), and never runs it', () => {
    const raw = `---\nx: !!js/function "function () { globalThis.${CANARY} = 1 }"\n---\n\n# B`;
    expect(() => renderMarkdown(raw)).toThrow();
    expect(globals[CANARY]).toBeUndefined();
  });
});

describe('hash rewrite: the user-content- prefix on in-page links', () => {
  /** Run the deferred work now, so a test can assert on what happened. */
  const now = (work: () => void): void => {
    work();
  };

  interface FakeDom {
    win: HashWindow;
    doc: HashDocument;
    location: { hash: string; href: string };
    /** What the page was asked to scroll to, by how it was found. */
    scrolled: string[];
    /** Go to `hash` the way a browser does: update the location, then fire `hashchange`. */
    navigate(hash: string): void;
    /** Dispatch a click on `target`. */
    click(target: unknown, defaultPrevented?: boolean): void;
    listenerCount(): number;
  }

  /** A window and document that know the given ids and names, with no DOM behind them. */
  function fakeDom(known: { ids?: string[]; names?: string[] }, hash = ''): FakeDom {
    const scrolled: string[] = [];
    const target = (label: string): ScrollTarget => ({
      scrollIntoView: () => {
        scrolled.push(label);
      },
    });
    const onHashChange: Array<() => void> = [];
    const onClick: Array<(event: HashClickEvent) => void> = [];
    const location = { hash, href: `https://spa.test/${hash}` };
    const remove = <T>(list: T[], item: T): void => {
      const at = list.indexOf(item);
      if (at !== -1) list.splice(at, 1);
    };
    const win: HashWindow = {
      location,
      addEventListener: (_type, listener) => {
        onHashChange.push(listener);
      },
      removeEventListener: (_type, listener) => {
        remove(onHashChange, listener);
      },
    };
    const doc: HashDocument = {
      getElementById: (id) => (known.ids?.includes(id) ? target(`id:${id}`) : null),
      getElementsByName: (name) => (known.names?.includes(name) ? [target(`name:${name}`)] : []),
      addEventListener: (_type, listener) => {
        onClick.push(listener);
      },
      removeEventListener: (_type, listener) => {
        remove(onClick, listener);
      },
    };
    return {
      win,
      doc,
      location,
      scrolled,
      navigate: (next) => {
        location.hash = next;
        location.href = `https://spa.test/${next}`;
        for (const listener of [...onHashChange]) listener();
      },
      click: (clicked, defaultPrevented = false) => {
        for (const listener of [...onClick]) listener({ target: clicked, defaultPrevented });
      },
      listenerCount: () => onHashChange.length + onClick.length,
    };
  }

  // Compile-time only (tsc, not vitest): the real window and document satisfy the structural types, so the shell can
  // pass them as they are.
  const realDomIsAccepted: [typeof window, typeof document] extends [HashWindow, HashDocument] ? true : never = true;
  void realDomIsAccepted;

  describe('prefixedIdForHash', () => {
    it.each([
      ['#intro', 'user-content-intro'],
      ['intro', 'user-content-intro'],
      ['#Intro', 'user-content-intro'], // github-slugger lower-cases, so the lookup does too
      ['#%C3%9Cberblick', 'user-content-überblick'],
      ['#__proto__', 'user-content-__proto__'],
      ['#user-content-intro', 'user-content-user-content-intro'], // authors link to the slug; the prefix goes on once
    ])('%s -> %s', (hash, id) => {
      expect(prefixedIdForHash(hash)).toBe(id);
    });

    it.each(['', '#', '#%', '#%E0%A4%A', '#%C3'])('has no id for %j', (hash) => {
      expect(prefixedIdForHash(hash)).toBeUndefined();
    });

    it('returns hostile text as a plain string, to be used as a key and never as markup or a selector', () => {
      expect(prefixedIdForHash('#<script>alert(1)</script>')).toBe('user-content-<script>alert(1)</script>');
      expect(prefixedIdForHash(`#${'a'.repeat(100_000)}`)).toHaveLength('user-content-'.length + 100_000);
    });
  });

  describe('scrollToHash', () => {
    it('scrolls to the element whose id is the prefixed hash', () => {
      const dom = fakeDom({ ids: ['user-content-intro'] }, '#intro');
      scrollToHash(dom.win, dom.doc, now);
      expect(dom.scrolled).toEqual(['id:user-content-intro']);
    });

    it('falls back to a name, as the sanitizer prefixes names too', () => {
      const dom = fakeDom({ names: ['user-content-legacy'] }, '#legacy');
      scrollToHash(dom.win, dom.doc, now);
      expect(dom.scrolled).toEqual(['name:user-content-legacy']);
    });

    it('never looks up the bare hash: content cannot steer the scroll with an unprefixed id', () => {
      const dom = fakeDom({ ids: ['intro'], names: ['intro'] }, '#intro');
      scrollToHash(dom.win, dom.doc, now);
      expect(dom.scrolled).toEqual([]);
    });

    it('does nothing for an empty hash or one that is not valid percent-encoding', () => {
      for (const hash of ['', '#', '#%E0%A4%A']) {
        const dom = fakeDom({ ids: ['user-content-', 'user-content-%e0%a4%a'] }, hash);
        scrollToHash(dom.win, dom.doc, now);
        expect(dom.scrolled).toEqual([]);
      }
    });

    it('defers the scroll until the browser has finished with the navigation', () => {
      const queue: Array<() => void> = [];
      const dom = fakeDom({ ids: ['user-content-intro'] }, '#intro');
      scrollToHash(dom.win, dom.doc, (work) => {
        queue.push(work);
      });
      expect(dom.scrolled).toEqual([]);
      queue.forEach((work) => work());
      expect(dom.scrolled).toEqual(['id:user-content-intro']);
    });

    it('defers with setTimeout by default', () => {
      vi.useFakeTimers();
      try {
        const dom = fakeDom({ ids: ['user-content-intro'] }, '#intro');
        scrollToHash(dom.win, dom.doc);
        expect(dom.scrolled).toEqual([]);
        vi.runAllTimers();
        expect(dom.scrolled).toEqual(['id:user-content-intro']);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('installHashRewrite', () => {
    const KNOWN = { ids: ['user-content-intro', 'user-content-other'] };

    it('scrolls to the hash the page loaded with', () => {
      const dom = fakeDom(KNOWN, '#intro');
      installHashRewrite(dom.win, dom.doc, now);
      expect(dom.scrolled).toEqual(['id:user-content-intro']);
    });

    it('scrolls when the hash changes', () => {
      const dom = fakeDom(KNOWN, '');
      installHashRewrite(dom.win, dom.doc, now);
      expect(dom.scrolled).toEqual([]);
      dom.navigate('#other');
      expect(dom.scrolled).toEqual(['id:user-content-other']);
    });

    it('scrolls when a link to the hash the page is already on is clicked: no hashchange fires for that', () => {
      const dom = fakeDom(KNOWN, '#intro');
      installHashRewrite(dom.win, dom.doc, now);
      dom.scrolled.length = 0;
      dom.click({ href: 'https://spa.test/#intro' });
      expect(dom.scrolled).toEqual(['id:user-content-intro']);
    });

    it('scrolls when the click lands on an element inside the link', () => {
      const dom = fakeDom(KNOWN, '#intro');
      installHashRewrite(dom.win, dom.doc, now);
      dom.scrolled.length = 0;
      const anchor = { href: 'https://spa.test/#intro' };
      dom.click({ closest: (selector: string) => (selector === 'a[href]' ? anchor : null) });
      expect(dom.scrolled).toEqual(['id:user-content-intro']);
    });

    it.each([
      ['a link to another hash (the browser will fire hashchange for it)', { href: 'https://spa.test/#other' }],
      ['an element that is not a link', { tagName: 'P' }],
      ['an element inside no link', { closest: () => null }],
      ['nothing at all', null],
    ])('ignores a click on %s', (_name, clicked) => {
      const dom = fakeDom(KNOWN, '#intro');
      installHashRewrite(dom.win, dom.doc, now);
      dom.scrolled.length = 0;
      dom.click(clicked);
      expect(dom.scrolled).toEqual([]);
    });

    it('ignores a click that another handler has already handled', () => {
      const dom = fakeDom(KNOWN, '#intro');
      installHashRewrite(dom.win, dom.doc, now);
      dom.scrolled.length = 0;
      dom.click({ href: 'https://spa.test/#intro' }, true);
      expect(dom.scrolled).toEqual([]);
    });

    it('ignores a click on a link to a bare "#"', () => {
      const dom = fakeDom(KNOWN, '#');
      installHashRewrite(dom.win, dom.doc, now);
      dom.click({ href: 'https://spa.test/#' });
      expect(dom.scrolled).toEqual([]);
    });

    it('uninstalls completely', () => {
      const dom = fakeDom(KNOWN, '#intro');
      const uninstall = installHashRewrite(dom.win, dom.doc, now);
      expect(dom.listenerCount()).toBe(2);
      dom.scrolled.length = 0;
      uninstall();
      expect(dom.listenerCount()).toBe(0);
      dom.navigate('#other');
      dom.click({ href: 'https://spa.test/#other' });
      expect(dom.scrolled).toEqual([]);
    });
  });

  describe('with the pipeline', () => {
    it('finds the heading a rendered in-page link points at, which the bare hash never would', () => {
      const html = render('# Intro\n\n[see](#intro)\n\n# Überblick\n\n[siehe](#Überblick)\n\n# Intro\n\n[again](#intro-1)');
      const ids = headingIds(html).filter((id): id is string => id !== undefined);
      const hrefs = attributeValues(html, 'a', 'href');
      expect(hrefs).toHaveLength(3);
      for (const href of hrefs) {
        // The sanitizer leaves the href as written, so a naive lookup of the hash finds no heading...
        expect(ids).not.toContain(decodeURIComponent(href.slice(1)).toLowerCase());
        // ...and the rewrite does.
        const dom = fakeDom({ ids }, href);
        scrollToHash(dom.win, dom.doc, now);
        expect(dom.scrolled, href).toHaveLength(1);
      }
    });
  });
});

describe('real curriculum markdown', () => {
  const tree = diskTree(ROOT);
  const files = curriculumFiles(tree);
  const rendered = new Map<string, string>();
  const renderFile = (path: string): string => {
    let html = rendered.get(path);
    if (html === undefined) {
      html = render(tree.read(path));
      rendered.set(path, html);
    }
    return html;
  };

  it('finds curriculum files to sweep, with headings in them (so the sweep below is not vacuous)', () => {
    expect(files.length).toBeGreaterThan(0);
    const headings = files.reduce((count, file) => count + headingIds(renderFile(file.path)).length, 0);
    expect(headings).toBeGreaterThan(0);
  });

  it.each(files.map((file) => file.path))('%s: no AC3 violation, no duplicate id, no front-matter leak', (path) => {
    const raw = tree.read(path);
    const html = renderFile(path);
    expect(ac3Violations(html)).toEqual([]);
    expect(duplicateIds(html)).toEqual([]);
    // The front matter is split off by gray-matter here and by remark-frontmatter in the chain. Rendering the whole
    // file through the chain alone must give the same HTML, so the two parsers agree on where the block ends.
    expect(html).toBe(String(createProcessor().processSync(raw)));
  });
});
