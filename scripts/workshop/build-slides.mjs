#!/usr/bin/env node
// Phase 2 — zero-devDep workshop deck builder.
//
// Reads every workshop/slides/*.md in sorted filename order, splits each
// file into slides on lines containing only `---`, renders a minimal
// markdown subset (headings, fenced code, bullet lists, inline code,
// paragraphs), and emits a single self-contained workshop/dist/index.html.
//
// Why a custom renderer instead of reveal-md / marked: see
// workshop/README.md → "Slide framework decision". Lowest-maintenance wins
// for a 6-module talking-head deck with code blocks + screenshots; no new
// devDeps, no transitive CVE churn.

import { readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const SLIDES_DIR = join(REPO_ROOT, 'workshop', 'slides');
const DIST_DIR = join(REPO_ROOT, 'workshop', 'dist');
const OUT_FILE = join(DIST_DIR, 'index.html');

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(line) {
  // Escape first, then re-introduce a small set of inline markers by
  // operating on the escaped output using the escaped quotes.
  let out = escapeHtml(line);
  // Inline code: `...` — must run before other inline markers. We
  // operate on the escaped text, so backticks are still literal.
  out = out.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  // Bold: **...**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return out;
}

function renderSlide(body) {
  const lines = body.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block.
    const fence = line.match(/^```(\S*)\s*$/);
    if (fence) {
      const lang = fence[1] || '';
      const buf = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // Headings.
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // Bullet list block.
    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^-\s+/, ''))}</li>`);
        i += 1;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Image: ![alt](src) on its own line.
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (img) {
      const alt = escapeHtml(img[1]);
      const src = escapeHtml(img[2]);
      out.push(`<img src="${src}" alt="${alt}">`);
      i += 1;
      continue;
    }

    // Blank line.
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Paragraph — accumulate contiguous non-special lines.
    const para = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4}\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^-\s+/.test(lines[i])
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

function loadSlides() {
  const files = readdirSync(SLIDES_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();
  const slides = [];
  for (const f of files) {
    const raw = readFileSync(join(SLIDES_DIR, f), 'utf8');
    const body = stripFrontmatter(raw);
    // A file with no explicit slide separator is a single slide.
    const chunks = body.split(/\n---\n/);
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (trimmed) slides.push({ source: f, html: renderSlide(trimmed) });
    }
  }
  return slides;
}

const CSS = `:root{color-scheme:light dark;--fg:#1a1a1a;--bg:#fff;--accent:#0057b8;--code-bg:#f4f4f6;--muted:#555}
@media (prefers-color-scheme:dark){:root{--fg:#eee;--bg:#111;--code-bg:#1e1e22;--muted:#aaa;--accent:#4ea8ff}}
*{box-sizing:border-box}
html,body{margin:0;padding:0;color:var(--fg);background:var(--bg);font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5}
main{scroll-snap-type:y mandatory;overflow-y:scroll;height:100vh}
section.slide{scroll-snap-align:start;min-height:100vh;padding:6vh 8vw;display:flex;flex-direction:column;justify-content:center;border-bottom:1px solid var(--muted)}
section.slide h1{font-size:clamp(1.8rem,4vw,3rem);color:var(--accent);margin:0 0 .5em}
section.slide h2{font-size:clamp(1.4rem,3vw,2.2rem);margin:0 0 .5em}
section.slide h3{font-size:clamp(1.1rem,2vw,1.5rem);margin:1em 0 .3em}
section.slide p,section.slide li{font-size:clamp(1rem,1.5vw,1.25rem)}
section.slide pre{background:var(--code-bg);padding:1em;border-radius:6px;overflow-x:auto;font-size:clamp(.85rem,1.2vw,1rem)}
section.slide code{font-family:ui-monospace,Menlo,Consolas,monospace}
section.slide :not(pre) > code{background:var(--code-bg);padding:.1em .35em;border-radius:3px}
section.slide img{max-width:100%;max-height:60vh;object-fit:contain;margin:1em 0}
section.slide ul{padding-left:1.2em}
footer.deck-meta{position:fixed;bottom:.5em;right:1em;font-size:.75rem;color:var(--muted);opacity:.7}
@media print{main{height:auto;overflow:visible}section.slide{page-break-after:always;border:none;min-height:auto}}`;

function renderDeck(slides) {
  const sections = slides
    .map((s, idx) => `<section class="slide" id="slide-${idx + 1}" data-source="${escapeHtml(s.source)}">\n${s.html}\n</section>`)
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Advanced Copilot CLI Workshop</title>
<style>${CSS}</style>
</head>
<body>
<main>
${sections}
</main>
<footer class="deck-meta">Advanced Copilot CLI Workshop — slide <span id="n">1</span>/${slides.length}</footer>
</body>
</html>
`;
}

function main() {
  if (!existsSync(SLIDES_DIR)) {
    console.error(`no slide source directory: ${SLIDES_DIR}`);
    process.exit(1);
  }
  rmSync(DIST_DIR, { recursive: true, force: true });
  mkdirSync(DIST_DIR, { recursive: true });
  const slides = loadSlides();
  if (slides.length === 0) {
    console.error('no slides found');
    process.exit(1);
  }
  writeFileSync(OUT_FILE, renderDeck(slides), 'utf8');
  console.log(`built ${slides.length} slide(s) → ${OUT_FILE}`);
}

main();
