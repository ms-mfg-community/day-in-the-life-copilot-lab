// The automated accessibility checker the gate runs, and the exact selection passed to it (specs/005-teaching-spa.md 2.11,
// AC15; child issue 10). This is the ONE place the configuration lives: a11y-browser-check.mjs imports it and hands
// `runOnly` to the checker unchanged, and a11y-tool-config.test.ts holds it against the declaration in
// workshop/spa/docs/a11y-tool.md, so the document and the gate cannot say different things.
//
// The checker is axe-core, run inside the page in a real browser. The selection is by tag: every rule axe-core marks as a
// WCAG 2.0, 2.1 or 2.2 Level A or AA rule, and nothing else (no best-practice rules, no experimental ones). axe-core has no
// `wcag22a` tag: the two Level A criteria new in 2.2 (3.2.6, 3.3.7) have no automated rule, as the conformance record says.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const A11Y_TOOL = Object.freeze({
  tool: 'axe-core',
  version: require('axe-core/package.json').version,
  entry: 'axe.min.js, injected into the page; axe.run(document, { runOnly })',
  runOnly: Object.freeze({
    type: 'tag',
    values: Object.freeze(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']),
  }),
});

/** The path of the script the runner injects. */
export const AXE_SCRIPT = require.resolve('axe-core/axe.min.js');
