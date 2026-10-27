#!/usr/bin/env node
/**
 * Screenshot every slide of workshop/site/hackathon.html at 1920x1080.
 * Output: .orchestrator/screenshots/slide-NN.png (zero-padded).
 *
 * Drives the deck by toggling the .active class on each <section.slide>
 * in document order (matches the deck's own currentSlide indexing).
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const siteDir = path.join(repoRoot, 'workshop', 'site');
const outDir = path.join(repoRoot, '.orchestrator', 'screenshots');

const VIEWPORT = { width: 1920, height: 1080 };
const SETTLE_MS = 650;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

function startStaticServer(rootDir) {
  // Serve the deck over HTTP so fetch('agenda.json') succeeds. Chromium rejects
  // fetch against file:// URLs (null origin / CORS), which leaves slide 3's
  // #agenda-tabs and #agenda-days empty in screenshots.
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const safePath = path
        .normalize(urlPath)
        .replace(/^([\\/])+/, '');
      const filePath = path.join(rootDir, safePath);
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.stat(filePath)
        .then(async (stat) => {
          const target = stat.isDirectory()
            ? path.join(filePath, 'hackathon.html')
            : filePath;
          const data = await fs.readFile(target);
          const ext = path.extname(target).toLowerCase();
          res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
            'Content-Length': data.length,
          });
          res.end(data);
        })
        .catch(() => {
          res.writeHead(404);
          res.end('Not found');
        });
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const { server, port } = await startStaticServer(siteDir);
  const deckUrl = `http://127.0.0.1:${port}/hackathon.html`;

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.goto(deckUrl, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);

  const totalSlides = await page.evaluate(
    () => document.querySelectorAll('section.slide').length
  );

  if (totalSlides === 0) {
    throw new Error('No <section.slide> elements found in deck');
  }
  console.log(`Found ${totalSlides} slides`);

  const titles = await page.evaluate(() =>
    Array.from(document.querySelectorAll('section.slide')).map(
      (s) => s.dataset.title || s.querySelector('h1,h2')?.textContent?.trim() || ''
    )
  );

  for (let i = 0; i < totalSlides; i++) {
    // Drive navigation through the deck's own keyboard handler so updateUI()
    // runs (slide counter, progress bar, notes panel content all update). The
    // previous approach of toggling .active directly left the counter frozen
    // at the initial value and skipped the transition timing logic.
    await page.keyboard.press('Home');
    for (let j = 0; j < i; j++) await page.keyboard.press('ArrowRight');

    await page.evaluate(() => document.fonts && document.fonts.ready);
    // Wait for the 0.5s slide transition + counter DOM update to settle so
    // the previous slide isn't ghosted underneath the active one.
    await page.waitForFunction(
      (idx) => {
        const slides = document.querySelectorAll('section.slide');
        const active = slides[idx];
        if (!active || !active.classList.contains('active')) return false;
        const counter = document.getElementById('slide-counter');
        if (!counter || !counter.textContent.trim().startsWith(String(idx + 1) + ' /')) {
          return false;
        }
        // If this slide hosts the async-loaded agenda, also wait for it to render.
        const agendaDays = active.querySelector('#agenda-days');
        if (agendaDays && agendaDays.children.length === 0) return false;
        const agendaTabs = active.querySelector('#agenda-tabs');
        if (agendaTabs && agendaTabs.children.length === 0) return false;
        return true;
      },
      i,
      { timeout: 10000 }
    );
    await page.waitForTimeout(SETTLE_MS);
    await page.evaluate(() => window.scrollTo(0, 0));

    const slug = (titles[i] || `slide-${i}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'untitled';

    const file = path.join(outDir, `slide-${pad2(i + 1)}-${slug}.png`);
    await page.screenshot({ path: file, fullPage: false });
    process.stdout.write(`  [${pad2(i + 1)}/${totalSlides}] ${path.basename(file)}\n`);
  }

  await browser.close();
  server.close();
  console.log(`Done. Screenshots in ${path.relative(repoRoot, outDir)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
