// Child issue 3 (SPA-03), AC4: a link from one slide to another is a route in the built application.
//
// Curriculum markdown links a sibling slide the way GitHub renders it, by a path that ends in .md. The built application
// is one page with the slides compiled in, so that href leaves it for a file that is not deployed (HTTP 404). The build
// rewrites an href that names another slide of the manifest to that segment's hash route, and leaves every other href
// exactly as written. These tests cover the rewrite on its own, then the real curriculum as the build renders it.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRenderer, renderMarkdown } from '../../workshop/spa/src/content/markdown';
import { rewriteSlideLinks, type SlideRef } from '../../workshop/spa/src/content/slide-links';
import { loadSegments } from '../../workshop/spa/vite-content-plugin';
import { attributeValues } from './helpers/html-scan';

const ROOT = process.cwd();
const FROM = 'workshop/slides/10-first.md';
const SLIDES: SlideRef[] = [
  { id: 'first', slideSource: FROM },
  { id: 'second', slideSource: 'workshop/slides/20-second.md' },
  { id: 'nested', slideSource: 'workshop/slides/deep/30-nested.md' },
  { id: 'spaced', slideSource: 'workshop/slides/40 spaced.md' },
];

/** `markdown` as the build renders the slide at `slideSource`: the plugin ahead of the sanitizer. */
function rewritten(markdown: string, slideSource = FROM, slides: SlideRef[] = SLIDES): string {
  return createRenderer({ extraRehypePlugins: [[rewriteSlideLinks, { slideSource, slides }]] })(markdown).html;
}

const hrefs = (html: string) => attributeValues(html, 'a', 'href');

describe('a link to another slide of the manifest', () => {
  it.each([
    ['a sibling', '20-second.md', FROM, '#/second'],
    ['a sibling written ./', './20-second.md', FROM, '#/second'],
    ['a sibling through its directory', '../slides/20-second.md', FROM, '#/second'],
    ['a slide in a subdirectory', 'deep/30-nested.md', FROM, '#/nested'],
    ['a slide in the parent directory', '../20-second.md', 'workshop/slides/deep/30-nested.md', '#/second'],
    ['the slide itself', '10-first.md', FROM, '#/first'],
    ['a name with a space, as the parser encodes it', '<40 spaced.md>', FROM, '#/spaced'],
    ['a link with a fragment, which a route cannot carry', '20-second.md#some-heading', FROM, '#/second'],
    ['a link with a query', '20-second.md?plain=1', FROM, '#/second'],
  ])('routes %s to its segment', (_label, target, from, route) => {
    expect(hrefs(rewritten(`[go](${target})`, from))).toEqual([route]);
  });

  it('changes the href and nothing else about the link', () => {
    expect(rewritten('[go **now**](20-second.md "the next one")')).toBe(
      '<p><a href="#/second" title="the next one">go <strong>now</strong></a></p>',
    );
  });

  it('rewrites each link on its own, wherever it sits in the document', () => {
    const markdown = [
      'A [routed](20-second.md) and an [external](https://example.com/20-second.md) link.',
      '',
      '- an item with [another](deep/30-nested.md)',
      '',
      '  > and a quote with [a lab](../../labs/lab-01.md) and [the first](10-first.md)',
      '',
      '[reference style][next]',
      '',
      '[next]: 20-second.md',
    ].join('\n');
    expect(hrefs(rewritten(markdown))).toEqual([
      '#/second',
      'https://example.com/20-second.md',
      '#/nested',
      '../../labs/lab-01.md',
      '#/first',
      '#/second',
    ]);
  });

  it('encodes the id into the route, so a hostile id cannot add an attribute', () => {
    const slides = [{ id: 'x" onclick="alert(1)', slideSource: 'workshop/slides/20-second.md' }];
    const html = rewritten('[go](20-second.md)', FROM, slides);
    expect(hrefs(html)).toEqual(['#/x%22%20onclick%3D%22alert(1)']);
    expect(attributeValues(html, 'a', 'onclick')).toEqual([]);
  });
});

describe('every other href is left exactly as it was written', () => {
  it.each([
    ['a file that is not a slide of the manifest', '99-other.md'],
    ['a lab', '../../labs/lab-01-start.md'],
    ['an external URL that ends in a slide path', 'https://example.com/workshop/slides/20-second.md'],
    ['a network-path reference', '//example.com/workshop/slides/20-second.md'],
    ['a root-relative reference', '/workshop/slides/20-second.md'],
    ['a mailto link', 'mailto:someone@example.com'],
    ['an in-page anchor', '#heading'],
    ['a bare query', '?plain=1'],
    ['a slide name in another case', '20-SECOND.md'],
    ['a slide name in another directory', 'elsewhere/20-second.md'],
  ])('leaves %s alone', (_label, target) => {
    const markdown = `[go](${target})`;
    expect(hrefs(rewritten(markdown))).toEqual([target]);
    expect(rewritten(markdown)).toBe(renderMarkdown(markdown).html);
  });

  it('does not bring back a link the sanitizer removes', () => {
    expect(hrefs(rewritten('[go](javascript:alert(1))'))).toEqual([]);
  });

  it('is the same pipeline: a renderer with this plugin still refuses JavaScript front matter', () => {
    expect(() => rewritten('---js\n({ title: "x" })\n---\n# x\n')).toThrow();
  });
});

describe('rewriteSlideLinks on a tree it did not expect', () => {
  const transform = rewriteSlideLinks({ slideSource: FROM, slides: SLIDES });
  const anchor = (href: unknown) => ({ type: 'element', tagName: 'a', properties: { href }, children: [] as unknown[] });

  it('leaves an href that is not valid percent-encoding, and does not throw', () => {
    const link = anchor('%E0%A4%A.md');
    expect(() => transform({ type: 'root', children: [link] })).not.toThrow();
    expect(link.properties.href).toBe('%E0%A4%A.md');
  });

  it('skips an anchor with no href, with an href that is not a string, and with no properties', () => {
    const none = { type: 'element', tagName: 'a', properties: {}, children: [] as unknown[] };
    const list = anchor(['20-second.md']);
    const bare = { type: 'element', tagName: 'a', children: [] as unknown[] };
    expect(() => transform({ type: 'root', children: [none, list, bare] })).not.toThrow();
    expect(none.properties).toEqual({});
    expect(list.properties.href).toEqual(['20-second.md']);
    expect(bare).toEqual({ type: 'element', tagName: 'a', children: [] });
  });

  // Each of these joins onto the slide's directory and normalizes to a real slide path, so only the rule that rules it
  // out (a scheme, or a leading slash) keeps it from being rewritten.
  it.each(['https://../20-second.md', 'a:/../20-second.md', '/../slides/20-second.md', '//../slides/20-second.md'])(
    'does not read %s as a path to a slide, however it normalizes',
    (href) => {
      const link = anchor(href);
      transform({ type: 'root', children: [link] });
      expect(link.properties.href).toBe(href);
    },
  );

  it('only ever touches an anchor, even when another element carries an href to a slide', () => {
    const other = { type: 'element', tagName: 'link', properties: { href: '20-second.md' }, children: [] as unknown[] };
    const text = { type: 'text', value: '20-second.md', properties: { href: '20-second.md' } };
    transform({ type: 'root', children: [other, text] });
    expect(other.properties.href).toBe('20-second.md');
    expect(text.properties.href).toBe('20-second.md');
  });

  it('walks a tree nested far deeper than the call stack allows', () => {
    const link = anchor('20-second.md');
    let node: unknown = link;
    for (let depth = 0; depth < 100_000; depth++) {
      node = { type: 'element', tagName: 'div', properties: {}, children: [node] };
    }
    expect(() => transform({ type: 'root', children: [node] })).not.toThrow();
    expect(link.properties.href).toBe('#/second');
  });

  it.each([undefined, null, 'text', 42, {}, { children: 'not a list' }, { children: [null, 7, 'x'] }])(
    'is handed %j and does not throw',
    (tree) => {
      expect(() => transform(tree)).not.toThrow();
    },
  );

  it('ignores manifest entries that are not slides', () => {
    const broken = [{ id: 1, slideSource: 'workshop/slides/20-second.md' }, { slideSource: 5 }, {}] as unknown as SlideRef[];
    const link = anchor('20-second.md');
    expect(() => rewriteSlideLinks({ slideSource: FROM, slides: broken })({ type: 'root', children: [link] })).not.toThrow();
    expect(link.properties.href).toBe('20-second.md');
  });
});

describe('the real curriculum, rendered as the build renders it', () => {
  const deck = JSON.parse(readFileSync(path.join(ROOT, 'workshop/spa/content/deck.json'), 'utf8')) as {
    segments: Array<{ id: string; slideSource: string }>;
  };
  const rendered = new Map(loadSegments(ROOT).map((segment) => [segment.id, segment.html]));
  const slideSources = new Set(deck.segments.map((segment) => segment.slideSource));
  const module6 = deck.segments.find((segment) => segment.id === 'm6-a2a-tmux')!;

  /**
   * The links in `html` that a reader of the slide at `slideSource` would follow to another slide of the manifest as a
   * file. The oracle is the URL parser, not the code under test: the href resolved against the slide's own location.
   */
  function linksToSlideFiles(html: string, slideSource: string): string[] {
    return hrefs(html).filter((href) => {
      if (href.startsWith('#')) return false;
      const target = new URL(href, `https://spa.test/${slideSource}`);
      return target.origin === 'https://spa.test' && slideSources.has(decodeURI(target.pathname.slice(1)));
    });
  }

  it('still links one slide to another, so the checks below are not vacuous', () => {
    const source = readFileSync(path.join(ROOT, module6.slideSource), 'utf8');
    expect(source).toContain('](56-module-5c-copilot-cli-extensions.md)');
    expect(source).toContain('](55-module-5b-gh-extensions.md)');
  });

  it('sends Module 6 to Modules 5c and 5b by their routes', () => {
    const found = hrefs(rendered.get('m6-a2a-tmux')!);
    expect(found).toContain('#/m5c-copilot-cli-extensions');
    expect(found).toContain('#/m5b-gh-extensions');
  });

  it('keeps the words of those links as the curriculum wrote them', () => {
    const html = rendered.get('m6-a2a-tmux')!;
    expect(html).toContain('workshop/slides/56-module-5c-copilot-cli-extensions.md</code>');
    expect(html).toContain('>gh</code> extensions</a>');
  });

  it('leaves no link in any segment that resolves to a slide of the manifest as a file', () => {
    let anchors = 0;
    const stale: string[] = [];
    for (const segment of deck.segments) {
      const html = rendered.get(segment.id)!;
      anchors += hrefs(html).length;
      for (const href of linksToSlideFiles(html, segment.slideSource)) stale.push(`${segment.id}: ${href}`);
    }
    expect(anchors).toBeGreaterThan(0);
    expect(stale).toEqual([]);
  });

  it('would notice the bug: through the plain pipeline the same sweep finds both stale links in Module 6', () => {
    const plain = renderMarkdown(readFileSync(path.join(ROOT, module6.slideSource), 'utf8')).html;
    expect(linksToSlideFiles(plain, module6.slideSource)).toEqual([
      '56-module-5c-copilot-cli-extensions.md',
      '55-module-5b-gh-extensions.md',
    ]);
  });
});
