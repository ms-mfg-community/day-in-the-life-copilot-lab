#!/usr/bin/env node
/**
 * Presenter-mode regression test for workshop/site/hackathon.html.
 *
 * Verifies (at 1920x1080, chromium-only, file:// load):
 *   D2 — N-key toggles #speaker-notes panel; notes text matches the
 *        slide's <div class="slide-notes">; idempotent toggle off.
 *        Sampled on slides 1, 32, 64 (1-indexed).
 *   D3 — #btn-save-html triggers a Blob download whose HTML contains
 *        every slide's source notes as substrings.
 *   D4 — Any failure prints expected/actual + saves a FAIL-*.png and
 *        exits non-zero.
 *
 * Outputs:
 *   .orchestrator/screenshots/presenter-notes-{01,32,64}.png
 *   .orchestrator/exports/hackathon-with-notes.html
 *   On failure: .orchestrator/screenshots/FAIL-presenter-NN.png
 *
 * Discovered selectors / mechanisms (read-only inspection of deck source):
 *   - Notes panel:        #speaker-notes  (hidden by default; .visible class shows)
 *   - Notes content host: #notes-content  (contenteditable; populated from .slide-notes)
 *   - Per-slide source:   section.slide > .slide-notes  (textContent is canonical)
 *   - Toggle key:         document keydown 'n' or 'N' -> toggleNotes()
 *   - Export trigger:     #btn-save-html click -> Blob download "presentation.html"
 */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const deckPath = path.join(repoRoot, 'workshop', 'site', 'hackathon.html');
const screenshotsDir = path.join(repoRoot, '.orchestrator', 'screenshots');
const exportsDir = path.join(repoRoot, '.orchestrator', 'exports');
const exportPath = path.join(exportsDir, 'hackathon-with-notes.html');

const VIEWPORT = { width: 1920, height: 1080 };
const SETTLE_MS = 250;
const SAMPLE_SLIDES_1IDX = [1, 32, 64];

const pad2 = (n) => String(n).padStart(2, '0');

const failures = [];
function recordFail(msg) {
  console.error(`  ✗ ${msg}`);
  failures.push(msg);
}
function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

async function saveFailScreenshot(page, tag) {
  try {
    const file = path.join(screenshotsDir, `FAIL-presenter-${tag}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.error(`    saved debug screenshot: ${path.relative(repoRoot, file)}`);
  } catch (err) {
    console.error(`    (could not save debug screenshot: ${err.message})`);
  }
}

async function getPanelState(page) {
  return page.evaluate(() => {
    const el = document.getElementById('speaker-notes');
    if (!el) return { exists: false };
    const cs = window.getComputedStyle(el);
    return {
      exists: true,
      hasVisibleClass: el.classList.contains('visible'),
      transform: cs.transform,
      visibility: cs.visibility,
      display: cs.display,
    };
  });
}

async function getCurrentSlideNotes(page) {
  return page.evaluate(() => {
    const slides = document.querySelectorAll('section.slide');
    const active = Array.from(slides).findIndex((s) => s.classList.contains('active'));
    const idx = active < 0 ? 0 : active;
    const slideEl = slides[idx];
    const sourceEl = slideEl ? slideEl.querySelector('.slide-notes') : null;
    const panelEl = document.getElementById('notes-content');
    return {
      idx,
      sourceText: sourceEl ? sourceEl.textContent.trim() : '',
      panelText: panelEl ? panelEl.textContent.trim() : '',
    };
  });
}

async function gotoSlide0Indexed(page, idx) {
  // The deck wraps its JS in an IIFE so goToSlide isn't on window.
  // Drive navigation through the same keyboard handler users hit:
  // Home → slide 0, then ArrowRight × idx.
  await blurActive(page);
  await page.keyboard.press('Home');
  for (let i = 0; i < idx; i++) {
    await page.keyboard.press('ArrowRight');
  }
  await page.waitForTimeout(SETTLE_MS);
  // Sanity-check we landed on the right slide.
  const landed = await page.evaluate(() => {
    const slides = document.querySelectorAll('section.slide');
    return Array.from(slides).findIndex((s) => s.classList.contains('active'));
  });
  if (landed !== idx) {
    throw new Error(`gotoSlide0Indexed: expected active=${idx}, got ${landed}`);
  }
}

async function blurActive(page) {
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el && typeof el.blur === 'function') el.blur();
  });
}

async function pressN(page) {
  // The deck's keydown handler for 'n'/'N' calls e.preventDefault(), so a
  // real keypress no longer leaks 'n' into the focused contenteditable
  // (#notes-content). Use a real keypress to exercise the full binding.
  await page.keyboard.press('n');
  await page.waitForTimeout(SETTLE_MS);
}

async function main() {
  await fs.mkdir(screenshotsDir, { recursive: true });
  await fs.mkdir(exportsDir, { recursive: true });

  const deckUrl = pathToFileURL(deckPath).href;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await context.newPage();

  await page.goto(deckUrl, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  // Ensure a clean baseline: clear any localStorage carried into this origin.
  await page.evaluate(() => localStorage.clear());

  const totalSlides = await page.evaluate(
    () => document.querySelectorAll('section.slide').length
  );
  if (totalSlides === 0) throw new Error('No <section.slide> elements found in deck');
  console.log(`Deck loaded: ${totalSlides} slides`);

  // ── D2.1 — initial state: panel hidden ───────────────────────────────────
  console.log('\n[D2.1] Initial state — speaker-notes panel must be hidden');
  {
    const s = await getPanelState(page);
    if (!s.exists) {
      recordFail('#speaker-notes element missing from DOM');
      await saveFailScreenshot(page, 'initial-missing');
    } else if (s.hasVisibleClass) {
      recordFail(`expected no .visible class on #speaker-notes; got transform=${s.transform}`);
      await saveFailScreenshot(page, 'initial-visible');
    } else {
      pass(`#speaker-notes hidden (no .visible class; transform=${s.transform})`);
    }
  }

  // ── D2.2/D2.3/D2.5 — sample 3 slides; press N, screenshot, verify text ──
  console.log('\n[D2.2/2.3/2.5] Toggle on + content correctness on sampled slides');
  for (const oneIdx of SAMPLE_SLIDES_1IDX) {
    const zeroIdx = oneIdx - 1;
    if (zeroIdx >= totalSlides) {
      recordFail(`sample slide ${oneIdx} out of range (only ${totalSlides} slides)`);
      continue;
    }
    await gotoSlide0Indexed(page, zeroIdx);

    const before = await getPanelState(page);
    if (before.hasVisibleClass) {
      // Should be off after prior iteration's toggle-off; if not, force off.
      await pressN(page);
    }

    await pressN(page);
    const after = await getPanelState(page);
    if (!after.hasVisibleClass) {
      recordFail(`slide ${oneIdx}: pressing 'n' did not add .visible to #speaker-notes`);
      await saveFailScreenshot(page, `${pad2(oneIdx)}-toggle-on`);
      continue;
    }

    const notes = await getCurrentSlideNotes(page);
    if (!notes.sourceText) {
      recordFail(`slide ${oneIdx}: source <div class="slide-notes"> empty or missing`);
    } else if (!notes.panelText) {
      recordFail(`slide ${oneIdx}: panel #notes-content empty after toggle`);
    } else if (notes.panelText !== notes.sourceText) {
      const preview = (s) => (s.length > 80 ? s.slice(0, 80) + '…' : s);
      recordFail(
        `slide ${oneIdx}: panel text mismatch\n      expected: ${preview(notes.sourceText)}\n      actual:   ${preview(notes.panelText)}`
      );
      await saveFailScreenshot(page, `${pad2(oneIdx)}-content-mismatch`);
    } else {
      pass(`slide ${oneIdx}: panel visible + content matches source (${notes.panelText.length} chars)`);
    }

    // Capture visual evidence (panel open).
    const shotPath = path.join(screenshotsDir, `presenter-notes-${pad2(oneIdx)}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    pass(`captured ${path.relative(repoRoot, shotPath)}`);

    // ── D2.4 — toggle off (idempotent)
    await pressN(page);
    const off = await getPanelState(page);
    if (off.hasVisibleClass) {
      recordFail(`slide ${oneIdx}: pressing 'n' a second time did not remove .visible`);
      await saveFailScreenshot(page, `${pad2(oneIdx)}-toggle-off`);
    } else {
      pass(`slide ${oneIdx}: toggle-off works (idempotent)`);
    }
  }

  // ── D3 — Export-with-notes ───────────────────────────────────────────────
  console.log('\n[D3] Export-with-notes (#btn-save-html)');

  // Read source notes from the on-disk deck so we cross-check against a
  // clean source-of-truth (not the live page DOM, which can be mutated
  // by the contenteditable input handler).
  const deckHtml = await fs.readFile(deckPath, 'utf8');
  const sourceNotes = extractSlideNotesFromHtml(deckHtml);
  console.log(`  source-of-truth: ${sourceNotes.length} <div class="slide-notes"> blocks parsed from deck file`);
  if (sourceNotes.length !== totalSlides) {
    console.warn(
      `  ⚠ slide count (${totalSlides}) ≠ slide-notes block count (${sourceNotes.length}); some slides may have no notes (will be skipped in substring check)`
    );
  }

  // Open the panel so the export button is reachable, then click it.
  // We trigger the click programmatically (not via locator.click) to
  // avoid any actionability checks against the off-canvas panel.
  await pressN(page);
  const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
  await page.evaluate(() => {
    const btn = document.getElementById('btn-save-html');
    if (!btn) throw new Error('#btn-save-html not found');
    btn.click();
  });
  let download;
  try {
    download = await downloadPromise;
  } catch (err) {
    recordFail(`export did not trigger a download event within 10s: ${err.message}`);
    await saveFailScreenshot(page, 'export-no-download');
  }

  if (download) {
    await download.saveAs(exportPath);
    const stat = await fs.stat(exportPath);
    pass(`exported HTML saved to ${path.relative(repoRoot, exportPath)} (${stat.size} bytes)`);

    const exportHtml = await fs.readFile(exportPath, 'utf8');

    // Sanity: file is HTML.
    if (!/<!DOCTYPE html>/i.test(exportHtml) || !/<\/html>/i.test(exportHtml)) {
      recordFail('exported file does not look like a complete HTML document');
    } else {
      pass('exported file has DOCTYPE + closing </html>');
    }

    // Substring check per slide. We probe with a chunk of the *raw* inner
    // HTML of <div class="slide-notes"> so inline tags (<code>, <em>) don't
    // cause false negatives — the exporter clones DOM nodes verbatim, so
    // raw-HTML byte-equivalence is the strongest signal.
    let okSlides = 0;
    let emptySlides = 0;
    const missing = [];
    for (let i = 0; i < sourceNotes.length; i++) {
      const { text, raw } = sourceNotes[i];
      if (!text) {
        emptySlides += 1;
        continue;
      }
      const probe = raw.trim().slice(0, 80);
      if (exportHtml.includes(probe)) {
        okSlides += 1;
      } else {
        missing.push({ slide1: i + 1, text: text.slice(0, 60) });
      }
    }
    const checked = sourceNotes.length - emptySlides;
    pass(
      `notes substring check: ${okSlides}/${checked} slides matched (${emptySlides} slides have no notes — skipped)`
    );
    if (missing.length > 0) {
      const sample = missing.slice(0, 5).map((m) => `slide ${m.slide1}: "${m.text}…"`).join('; ');
      recordFail(`${missing.length} slides missing notes in export — first 5: ${sample}`);
    }

    // Spot check: slides 1/32/64 explicitly.
    for (const oneIdx of SAMPLE_SLIDES_1IDX) {
      const entry = sourceNotes[oneIdx - 1];
      if (!entry || !entry.text) {
        console.log(`  ⚠ slide ${oneIdx} has no source notes — skipping spot check`);
        continue;
      }
      const probe = entry.raw.trim().slice(0, 80);
      if (exportHtml.includes(probe)) {
        pass(`spot-check slide ${oneIdx}: notes present in export`);
      } else {
        recordFail(`spot-check slide ${oneIdx}: notes NOT present in export`);
      }
    }

    // F2 fix verification: open the standalone export in the browser and
    // assert .slide-notes is actually rendered visible (not just present
    // in markup). This is a hard check — it proves the export's CSS makes
    // the notes show up as a leave-behind handout.
    const exportUrl = pathToFileURL(exportPath).href;
    const exportPage = await context.newPage();
    await exportPage.goto(exportUrl, { waitUntil: 'load' });
    await exportPage.evaluate(() => document.fonts && document.fonts.ready);
    const exportNotesVisible = await exportPage.evaluate(() => {
      const nodes = document.querySelectorAll('.slide-notes');
      if (nodes.length === 0) return { count: 0 };
      let visibleCount = 0;
      let firstText = '';
      for (const el of nodes) {
        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const visible =
          cs.display !== 'none' &&
          cs.visibility !== 'hidden' &&
          parseFloat(cs.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0;
        if (visible) {
          visibleCount += 1;
          if (!firstText) firstText = el.textContent.trim().slice(0, 60);
        }
      }
      return { count: nodes.length, visibleCount, firstText };
    });
    await exportPage.close();
    if (exportNotesVisible.count === 0) {
      recordFail('export visibility check: no .slide-notes elements found in export');
    } else if (exportNotesVisible.visibleCount === 0) {
      recordFail(
        `export visibility check: ${exportNotesVisible.count} .slide-notes elements present but NONE are rendered visible (display:none / hidden / zero-size)`
      );
    } else {
      pass(
        `export visibility check: ${exportNotesVisible.visibleCount}/${exportNotesVisible.count} .slide-notes elements rendered visible (sample: "${exportNotesVisible.firstText}…")`
      );
    }
  }

  await browser.close();

  console.log('\n────────────────────────────────────────');
  if (failures.length > 0) {
    console.error(`FAIL: ${failures.length} assertion(s) failed`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('PASS: presenter-mode-test (all D2/D3 assertions met)');
}

/**
 * Extract <div class="slide-notes">…</div> blocks from the deck HTML in
 * source order. Returns an array of plain-text notes (HTML tags stripped,
 * entities decoded best-effort), one entry per <section class="slide">.
 * If a slide has no .slide-notes child, the entry is an empty string.
 */
function extractSlideNotesFromHtml(html) {
  const slideRe = /<section\b[^>]*\bclass="[^"]*\bslide\b[^"]*"[^>]*>([\s\S]*?)<\/section>/g;
  const notesRe = /<div\b[^>]*\bclass="slide-notes"[^>]*>([\s\S]*?)<\/div>/i;
  const out = [];
  let m;
  while ((m = slideRe.exec(html)) !== null) {
    const inner = m[1];
    const nm = notesRe.exec(inner);
    if (!nm) {
      out.push({ raw: '', text: '' });
      continue;
    }
    out.push({ raw: nm[1], text: htmlToText(nm[1]) });
  }
  return out;
}

function htmlToText(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
