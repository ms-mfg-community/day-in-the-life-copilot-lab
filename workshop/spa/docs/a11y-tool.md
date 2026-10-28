# The automated accessibility checker

The checker the Teaching SPA's accessibility gate runs, and the exact selection passed to it
([spec 005](../../../specs/005-teaching-spa.md), section 2.11, AC15). The gate is
`npm run spa:test:a11y`: it builds the application, then `tests/spa/a11y-browser-check.mjs`
opens the build in a real browser and runs the checker below over every route (each segment of
the deck and `#/script`) and over every interaction's opened state (one per entry of
`workshop/spa/content/interactions.json`, plus the shell's shortcuts dialog), and requires zero
violations. The same run measures every interactive element's box (AC17) and the computed
durations under `prefers-reduced-motion: reduce` (AC18).

## Declaration

The gate's configuration lives in one place, `tests/spa/helpers/a11y-tool.mjs`, which the runner
imports and hands to the checker unchanged. This block is what that module declares;
`tests/spa/a11y-tool-config.test.ts` fails when the two differ, or when the installed checker is
not the version named here.

```json
{
  "tool": "axe-core",
  "version": "4.14.0",
  "entry": "axe.min.js, injected into the page; axe.run(document, { runOnly })",
  "runOnly": {
    "type": "tag",
    "values": ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
  }
}
```

## Why this selection

- **axe-core**, run inside the page, is the checker: it reads the DOM the browser built, with
  layout and computed style, which is what a conformance claim about rendered controls needs. It
  is a devDependency (`package.json`); nothing is installed at run time.
- The selection is **by tag**, and the tags are every WCAG 2.0, 2.1 and 2.2 Level A and Level AA
  tag the installed version defines: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.
  Nothing else is selected: no `best-practice` rule, no `experimental` rule, no rule outside the
  conformance target. The installed version defines no `wcag22a` tag, because the two Level A
  criteria new in 2.2 (3.2.6 Consistent Help, 3.3.7 Redundant Entry) have no automated rule;
  the conformance record marks them `manual`.
- With this selection the installed version runs 70 rules (`axe.getRules(values).length`), each
  tagged with the success criterion it decides (`wcag412`, `wcag131`, `wcag143`, ...). The
  conformance record ([wcag-22-aa-conformance.md](wcag-22-aa-conformance.md)) marks a criterion
  `automated` only where this run decides it in full for this application; a criterion the checker
  covers in part is `manual`, with the checker's rules named as one of its inputs.

## What a clean run does and does not say

A clean run says the built page, in each route and each opened state, trips none of the 70 rules
in the browser the gate ran in. It does not say the application conforms: the conformance claim
rests on the per-criterion record, where every row declares `automated` or `manual` and points at
its evidence, and a clean automated run is one input to that record, never a substitute for it
(section 2.11; open questions Q9 and Q10).
