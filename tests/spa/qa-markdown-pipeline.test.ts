// Independent QA additions for spec 005 AC3 / section 2.2.
// The mutation runner beside this file exercises these assertions against copied
// source fixtures; it never changes workshop/spa/src/content.
import matter from 'gray-matter';
import { describe, expect, it, vi } from 'vitest';
import { createProcessor, renderMarkdown } from '../../workshop/spa/src/content/markdown';
import {
  installHashRewrite,
  scrollToHash,
} from '../../workshop/spa/src/content/hash-rewrite';
import type {
  Defer,
  HashClickEvent,
  HashDocument,
  HashWindow,
  ScrollTarget,
} from '../../workshop/spa/src/content/hash-rewrite';
import { ac3Violations, attributeValues, duplicateIds, headingIds } from './helpers/html-scan';

/** A queued scheduler, unlike an immediate fake, exposes the real click ordering. */
function queuedDom(hash = '#intro', ids = ['user-content-intro']) {
  const queue: Array<() => void> = [];
  const hashListeners = new Set<() => void>();
  const clickListeners = new Set<(event: HashClickEvent) => void>();
  const scroll = vi.fn();
  const target: ScrollTarget = { scrollIntoView: scroll };
  const location = { hash, href: `https://spa.test/${hash}` };
  const win: HashWindow = {
    location,
    addEventListener: (_type, listener) => { hashListeners.add(listener); },
    removeEventListener: (_type, listener) => { hashListeners.delete(listener); },
  };
  const doc: HashDocument = {
    getElementById: (id) => ids.includes(id) ? target : null,
    getElementsByName: () => [],
    addEventListener: (_type, listener) => { clickListeners.add(listener); },
    removeEventListener: (_type, listener) => { clickListeners.delete(listener); },
  };
  const defer: Defer = (work) => { queue.push(work); };
  const flush = () => {
    while (queue.length > 0) queue.shift()!();
  };
  const click = (): HashClickEvent => {
    const event = {
      target: { closest: () => ({ href: location.href }) },
      defaultPrevented: false,
    };
    for (const listener of clickListeners) listener(event);
    return event;
  };
  return { win, doc, scroll, location, hashListeners, clickListeners, defer, flush, click };
}

describe('QA markdown boundary and state', () => {
  const codeSample = '<script>alert(1)</script> <button onclick="demo()">demo</button> [x](javascript:alert(2))';

  it.each([
    { kind: 'inline', markdown: `\`${codeSample}\``, before: '<p><code>', after: '</code></p>' },
    {
      kind: 'fenced',
      markdown: `\`\`\`html\n${codeSample}\n\`\`\``,
      before: '<pre><code class="language-html">',
      after: '\n</code></pre>',
    },
  ])('preserves hostile-looking $kind code as inert text, not executable markup', ({ markdown, before, after }) => {
    const { html } = renderMarkdown(markdown);

    expect(html).toBe(`${before}${codeSample.replaceAll('<', '&#x3C;')}${after}`);
    expect(ac3Violations(html)).toEqual([]);
    expect(attributeValues(html, 'a', 'href')).toEqual([]);
  });

  it('isolates concurrent documents and sanitizes asynchronous plugin output on a shared processor', async () => {
    const appendLater = () => async (tree: unknown) => {
      await Promise.resolve();
      (tree as { children: unknown[] }).children.push(
        { type: 'element', tagName: 'h2', properties: {}, children: [{ type: 'text', value: 'Repeated' }] },
        { type: 'element', tagName: 'img', properties: { src: 'javascript:alert(1)', onError: 'alert(2)' }, children: [] },
      );
    };
    const processor = createProcessor({ extraRehypePlugins: [appendLater] });
    const count = 16;

    const files = await Promise.all(Array.from({ length: count }, (_, index) =>
      processor.process(`# Repeated\n\n# Repeated\n\nDocument ${index}`),
    ));

    files.forEach((file, index) => {
      const html = String(file);
      expect(headingIds(html)).toEqual([
        'user-content-repeated', 'user-content-repeated-1', 'user-content-repeated-2',
      ]);
      expect(html).toContain(`<p>Document ${index}</p>`);
      expect(ac3Violations(html)).toEqual([]);
      expect(duplicateIds(html)).toEqual([]);
    });
  });

  it.each([
    { name: 'YAML', raw: '---\nqa_invalid: [\n---\n\n# Body' },
    { name: 'JSON', raw: '---json\n{"qa_invalid": }\n---\n\n# Body' },
  ])('rejects malformed $name front matter and recovers on the next render', ({ raw }) => {
    expect(() => renderMarkdown(raw)).toThrow();
    expect(renderMarkdown('---\ntitle: recovered\n---\n\n# Body')).toEqual({
      data: { title: 'recovered' },
      html: '<h1 id="user-content-body">Body</h1>',
    });
  });

  it('returns independent mutable metadata for repeated input', () => {
    const raw = '---\ntitle: QA metadata isolation\ntags: [first]\n---\n\n# Body';
    const first = renderMarkdown(raw);
    expect(first.data).toEqual({ title: 'QA metadata isolation', tags: ['first'] });
    (first.data as { tags: string[] }).tags.push('caller mutation');

    expect(renderMarkdown(raw)).toEqual({
      data: { title: 'QA metadata isolation', tags: ['first'] },
      html: '<h1 id="user-content-body">Body</h1>',
    });
  });

  it('refuses JavaScript even when gray-matter has cached that exact input', () => {
    const globals = globalThis as Record<string, unknown>;
    const canary = '__spaIndependentQaCachedEngine';
    const raw = `---js\n(globalThis.${canary} = true, { title: 'cached' })\n---\n\n# Body`;
    try {
      // Positive control: an ordinary gray-matter caller both executes and caches it.
      expect(matter(raw).data).toEqual({ title: 'cached' });
      expect(globals[canary]).toBe(true);
      delete globals[canary];

      expect(() => renderMarkdown(raw)).toThrow(/JavaScript/);
      expect(globals[canary]).toBeUndefined();
    } finally {
      delete globals[canary];
    }
  });

  it('protects hostile content after a large body without truncating safe content', () => {
    const raw = [
      '---',
      'title: Large hostile appendix',
      '---',
      '',
      'safe '.repeat(25_000),
      '',
      ...Array.from({ length: 256 }, () => '# Repeated\n'),
      '[hostile](javascript:alert(1))',
      '',
      'tail <b onclick="alert(2)">safe tail</b>',
      '',
      '<script>alert(3)</script>',
      '',
      '[last safe link](https://example.com/end)',
    ].join('\n');

    const { data, html } = renderMarkdown(raw);
    expect(data).toEqual({ title: 'Large hostile appendix' });
    expect(ac3Violations(html)).toEqual([]);
    expect(duplicateIds(html)).toEqual([]);
    expect(headingIds(html)).toHaveLength(256);
    expect(headingIds(html).at(-1)).toBe('user-content-repeated-255');
    expect(attributeValues(html, 'a', 'href')).toEqual(['https://example.com/end']);
    expect(html).toContain('safe tail');
    expect(html).not.toContain('alert(3)');
  });

  it('preserves safe plugin additions while removing dangerous sibling nodes', () => {
    const inject = () => (tree: unknown) => {
      (tree as { children: unknown[] }).children.push({
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [
          { type: 'element', tagName: 'script', properties: {}, children: [{ type: 'text', value: 'unsafe' }] },
          { type: 'element', tagName: 'strong', properties: {}, children: [{ type: 'text', value: 'safe plugin text' }] },
        ],
      });
    };

    const html = String(createProcessor({ extraRehypePlugins: [inject] }).processSync('# Body'));
    expect(ac3Violations(html)).toEqual([]);
    expect(html).toContain('<strong>safe plugin text</strong>');
    expect(html).not.toContain('unsafe');
  });
});

describe('QA hash rewrite ordering and lifecycle', () => {
  it('prefers an ID over a same-named legacy anchor without querying the fallback', () => {
    const dom = queuedDom();
    const fallback = vi.fn(() => {
      throw new Error('the fallback must not run when the ID exists');
    });
    dom.doc.getElementsByName = fallback;

    scrollToHash(dom.win, dom.doc, dom.defer);
    expect(dom.scroll).not.toHaveBeenCalled();
    dom.flush();
    expect(dom.scroll).toHaveBeenCalledOnce();
    expect(fallback).not.toHaveBeenCalled();
  });

  it('decodes a percent-escaped fragment exactly once before choosing a heading', () => {
    const ids = headingIds(renderMarkdown('# a-b').html).filter((id): id is string => id !== undefined);
    const dom = queuedDom('#a%252Db', ids);

    scrollToHash(dom.win, dom.doc, dom.defer);
    dom.flush();
    expect(dom.scroll).not.toHaveBeenCalled();

    dom.location.hash = '#a%2Db';
    scrollToHash(dom.win, dom.doc, dom.defer);
    dom.flush();
    expect(dom.scroll).toHaveBeenCalledOnce();
  });

  it('honors cancellation added after its click listener returns', () => {
    const dom = queuedDom();
    const uninstall = installHashRewrite(dom.win, dom.doc, dom.defer);
    try {
      dom.flush();
      dom.scroll.mockClear();

      const event = dom.click();
      expect(dom.scroll).not.toHaveBeenCalled();
      event.defaultPrevented = true;
      dom.flush();
      expect(dom.scroll).not.toHaveBeenCalled();
    } finally {
      uninstall();
    }
  });

  it('keeps another installation working when one installation is disposed', () => {
    const dom = queuedDom();
    const first = installHashRewrite(dom.win, dom.doc, dom.defer);
    const second = installHashRewrite(dom.win, dom.doc, dom.defer);
    try {
      dom.flush();
      dom.scroll.mockClear();
      first();
      expect(dom.hashListeners.size).toBe(1);
      expect(dom.clickListeners.size).toBe(1);

      for (const listener of dom.hashListeners) listener();
      dom.flush();
      expect(dom.scroll).toHaveBeenCalledOnce();

      second();
      dom.scroll.mockClear();
      for (const listener of dom.hashListeners) listener();
      dom.click();
      dom.flush();
      expect(dom.scroll).not.toHaveBeenCalled();
    } finally {
      first();
      second();
    }
  });
});
