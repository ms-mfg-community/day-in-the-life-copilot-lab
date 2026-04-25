#!/usr/bin/env node
// Phase 2 (wave 2) — Reveal.js workshop deck builder.
//
// Reads every workshop/slides/*.md (sorted), splits each file into slides
// on lines containing only `---`, renders a minimal markdown subset plus
// Shiki-highlighted code blocks, and emits a Reveal.js-scaffolded
// workshop/dist/index.html that self-hosts reveal.js under
// workshop/dist/reveal/. Links workshop/styles/theme.css for branding.
//
// Degrades gracefully: if reveal.js is not available under node_modules
// (offline harness) the build falls back to a CDN script tag and prints
// a warning to stderr so V.1 / V.2 don't fail. Shiki failures per-block
// fall back to an escaped <pre><code> so a rare language can't kill the
// build.

import {
  readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync, existsSync,
  copyFileSync, statSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const SLIDES_DIR = join(REPO_ROOT, 'workshop', 'slides');
const DIST_DIR = join(REPO_ROOT, 'workshop', 'dist');
const OUT_FILE = join(DIST_DIR, 'index.html');
const REVEAL_OUT = join(DIST_DIR, 'reveal');
const REVEAL_SRC = join(REPO_ROOT, 'node_modules', 'reveal.js', 'dist');
const CURRICULUM = join(REPO_ROOT, 'workshop', 'curriculum.md');

const REVEAL_CDN = 'https://cdn.jsdelivr.net/npm/reveal.js@5';
const DEFAULT_TITLE = 'Day in the Life — GitHub Copilot Lab';
const SHIKI_THEME = 'github-light';
const SHIKI_LANGS = [
  'bash', 'javascript', 'typescript', 'json', 'yaml',
  'csharp', 'markdown', 'text', 'html', 'css', 'python',
];

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(line) {
  let out = escapeHtml(line);
  out = out.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return out;
}

async function renderCodeBlock(highlighter, lang, code) {
  const resolved = lang && SHIKI_LANGS.includes(lang) ? lang : 'text';
  try {
    const html = highlighter.codeToHtml(code, {
      lang: resolved,
      theme: SHIKI_THEME,
    });
    // Shiki emits <pre class="shiki ..."><code>...</code></pre>. Tag the
    // original language on the wrapper so the theme's language-label CSS
    // rule can pick it up.
    const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
    return html.replace(/^<pre([^>]*)>/, `<pre$1${langAttr}>`);
  } catch (err) {
    process.stderr.write(
      `shiki: falling back to plain <pre> for lang="${lang}" (${err.message})\n`,
    );
    const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
    return `<pre${cls}><code>${escapeHtml(code)}</code></pre>`;
  }
}

async function renderSlideBody(highlighter, body) {
  const lines = body.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^```(\S*)\s*$/);
    if (fence) {
      const lang = fence[1] || '';
      const buf = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(await renderCodeBlock(highlighter, lang, buf.join('\n')));
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      out.push(`<h${h[1].length}>${renderInline(h[2])}</h${h[1].length}>`);
      i += 1;
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^-\s+/, ''))}</li>`);
        i += 1;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (img) {
      out.push(`<img src="${escapeHtml(img[2])}" alt="${escapeHtml(img[1])}">`);
      i += 1;
      continue;
    }

    if (line.trim() === '') { i += 1; continue; }

    // Blockquote.
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(renderInline(lines[i].replace(/^>\s?/, '')));
        i += 1;
      }
      out.push(`<blockquote>${buf.join('<br>')}</blockquote>`);
      continue;
    }

    const para = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4}\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^-\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    out.push(`<p>${para.map(renderInline).join(' ')}</p>`);
  }
  return out.join('\n');
}

function stripFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return raw;
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return raw;
  return raw.slice(end + 5);
}

function classifySlide(sourceFile, body) {
  if (sourceFile === '00-cover.md') return 'cover';
  // Divider heuristic: a single `#` heading and ≤ 8 non-blank lines,
  // with no body content beyond headings / blank lines.
  const nonBlank = body.split('\n').filter((l) => l.trim() !== '');
  if (nonBlank.length > 8) return '';
  const headings = nonBlank.filter((l) => /^#{1,4}\s+/.test(l));
  if (headings.length === 1 && headings.length === nonBlank.length) {
    return 'divider';
  }
  return '';
}

function loadSlideSources() {
  const files = readdirSync(SLIDES_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();
  const slides = [];
  for (const f of files) {
    const raw = readFileSync(join(SLIDES_DIR, f), 'utf8');
    const body = stripFrontmatter(raw);
    const chunks = body.split(/\n---\n/);
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (trimmed) {
        slides.push({ source: f, body: trimmed, cls: classifySlide(f, trimmed) });
      }
    }
  }
  return slides;
}

function readWorkshopTitle() {
  if (!existsSync(CURRICULUM)) return DEFAULT_TITLE;
  const raw = readFileSync(CURRICULUM, 'utf8');
  if (!raw.startsWith('---\n')) return DEFAULT_TITLE;
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return DEFAULT_TITLE;
  const fm = raw.slice(4, end);
  const m = fm.match(/^title:\s*(.+)$/m);
  if (!m) return DEFAULT_TITLE;
  return m[1].trim().replace(/^["']|["']$/g, '');
}

function copyRevealAssets() {
  if (!existsSync(REVEAL_SRC)) return false;
  mkdirSync(REVEAL_OUT, { recursive: true });
  const files = [
    ['reveal.js', 'reveal.js'],
    ['reveal.css', 'reveal.css'],
    ['reset.css', 'reset.css'],
    ['plugin/notes.js', 'notes.js'],
  ];
  let copied = 0;
  for (const [src, dst] of files) {
    const s = join(REVEAL_SRC, src);
    if (!existsSync(s)) continue;
    try {
      if (!statSync(s).isFile()) continue;
      copyFileSync(s, join(REVEAL_OUT, dst));
      copied += 1;
    } catch (err) {
      process.stderr.write(`reveal: could not copy ${src}: ${err.message}\n`);
    }
  }
  return copied >= 2; // need at least reveal.js + reveal.css
}

function renderDeck({ slides, title, selfHosted }) {
  const sections = slides
    .map((s, idx) => {
      const cls = s.cls ? ` class="${s.cls}"` : '';
      return `<section${cls} data-source="${escapeHtml(s.source)}" data-slide="${idx + 1}">\n${s.html}\n</section>`;
    })
    .join('\n');

  const headTags = selfHosted
    ? `<link rel="stylesheet" href="reveal/reset.css">
<link rel="stylesheet" href="reveal/reveal.css">`
    : `<link rel="stylesheet" href="${REVEAL_CDN}/dist/reset.css">
<link rel="stylesheet" href="${REVEAL_CDN}/dist/reveal.css">`;

  const revealScript = selfHosted
    ? `<script src="reveal/reveal.js"></script>
<script src="reveal/notes.js"></script>`
    : `<script src="${REVEAL_CDN}/dist/reveal.js"></script>
<script src="${REVEAL_CDN}/plugin/notes/notes.js"></script>`;

  const escTitle = escapeHtml(title);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escTitle}</title>
${headTags}
<link rel="stylesheet" href="../styles/theme.css">
</head>
<body>
<div class="workshop-header" aria-hidden="true">${escTitle}</div>
<div class="reveal">
<div class="slides">
${sections}
</div>
</div>
${revealScript}
<script>
  Reveal.initialize({
    hash: true,
    slideNumber: 'c/t',
    transition: 'fade',
    controls: true,
    progress: true,
    keyboard: true,
    overview: true,
    plugins: typeof RevealNotes !== 'undefined' ? [RevealNotes] : [],
  });
</script>
</body>
</html>
`;
}

async function main() {
  if (!existsSync(SLIDES_DIR)) {
    process.stderr.write(`no slide source directory: ${SLIDES_DIR}\n`);
    process.exit(1);
  }

  const sources = loadSlideSources();
  if (sources.length === 0) {
    process.stderr.write('no slides found\n');
    process.exit(1);
  }

  let highlighter;
  try {
    const shiki = await import('shiki');
    highlighter = await shiki.createHighlighter({
      themes: [SHIKI_THEME],
      langs: SHIKI_LANGS,
    });
  } catch (err) {
    process.stderr.write(
      `shiki unavailable (${err.message}); code blocks will use plain <pre>\n`,
    );
    highlighter = {
      codeToHtml(code, { lang }) {
        const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
        return `<pre${cls}><code>${escapeHtml(code)}</code></pre>`;
      },
    };
  }

  const slides = [];
  for (const s of sources) {
    slides.push({ ...s, html: await renderSlideBody(highlighter, s.body) });
  }

  rmSync(DIST_DIR, { recursive: true, force: true });
  mkdirSync(DIST_DIR, { recursive: true });

  const selfHosted = copyRevealAssets();
  if (!selfHosted) {
    process.stderr.write(
      'reveal.js not found under node_modules — falling back to CDN script tags\n',
    );
  }

  const title = readWorkshopTitle();
  writeFileSync(
    OUT_FILE,
    renderDeck({ slides, title, selfHosted }),
    'utf8',
  );

  if (highlighter && typeof highlighter.dispose === 'function') {
    highlighter.dispose();
  }

  console.log(
    `built ${slides.length} slide(s) → ${OUT_FILE} ` +
    `(reveal: ${selfHosted ? 'self-hosted' : 'cdn-fallback'})`,
  );
}

main().catch((err) => {
  process.stderr.write(`build-slides: ${err.stack || err.message}\n`);
  process.exit(1);
});
