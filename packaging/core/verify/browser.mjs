import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(join(process.argv[2], 'node/package.json'));
const { chromium } = require('@playwright/test');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<title>Prepared browser readiness</title>');
  assert.equal(await page.title(), 'Prepared browser readiness');
  process.stdout.write(`${JSON.stringify({ browser: browser.version(), executable: chromium.executablePath() })}\n`);
} finally {
  await browser.close();
}
