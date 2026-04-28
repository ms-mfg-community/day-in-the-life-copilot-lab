# chore(test): retire modernize-arc temp tests; archive Phase-A findings; correct CHANGELOG

- **Base:** `feature/modernize`
- **Head:** `chore/retire-modernize-arc-temp-tests`

## Summary

Retires two vitest files that were modernize-arc instrumentation (never
durable product guards), archives the one-time Phase-A findings report
out of the active `.orchestrator/` dir so future loop rotations cannot
orphan it, and corrects a misattributed "known issue" in the
v2.1.0-workshop CHANGELOG entry. The workshop arc itself is not
touched.

## What changed

- **DELETED** `tests/meta/phase-a-findings-schema.test.ts` — validated
  the schema of a one-time Phase-A audit report; arc shipped.
- **DELETED** `tests/meta/all-phases-have-tests.test.ts` — hard-coded
  modernize-arc Phase 0–8 directory mapping + CHANGELOG phase naming;
  not a durable invariant.
- **RENAMED** `.orchestrator/phase-A-findings.md` →
  `docs/archive/phase-A-findings.md` via `git mv` (history preserved).
- **NEW** `docs/archive/README.md` — short note that this directory
  holds historical artifacts from shipped arcs for audit-trail reasons
  only; nothing here is active product or referenced by tests.
- **MODIFIED** `CHANGELOG.md` — `## [Unreleased]` block only. Adds
  `### Changed` entries for the two retired tests and a `### Corrections`
  sub-entry clarifying the v2.1.0-workshop "19 known failures" claim.
- **NEW** `.github/pr-body-temp-test-cleanup.md` (this file, draft).

## Rationale

Both retired tests were coupled to the modernize arc:

- `phase-a-findings-schema.test.ts` only made sense while the
  `.orchestrator/phase-A-findings.md` audit report was live state; the
  arc is shipped and the report is now an archived historical artifact.
- `all-phases-have-tests.test.ts` enforced a Phase 0–8 directory map
  and CHANGELOG phase-naming convention specific to the modernize arc.
  It would block any future arc that uses a different phase shape.

Moving the findings report into `docs/archive/` also permanently breaks
the path coupling that caused the environmental "19 failures"
illusion — see correction below.

## Before / after test counts

| | Tests |
|---|---|
| Before (HEAD `15cd046`, clean WT) | **393 passed** |
| After  (this branch, clean WT)    | **364 passed** |

Delta: **−29** assertions (19 from `phase-a-findings-schema`, 10 from
`all-phases-have-tests`). `0 failed` on both sides. `tests/workshop/`
remains **75 passed**, unchanged.

## Scope (file list)

```
tests/meta/phase-a-findings-schema.test.ts  | deleted
tests/meta/all-phases-have-tests.test.ts    | deleted
.orchestrator/phase-A-findings.md           → docs/archive/phase-A-findings.md  (rename)
docs/archive/README.md                      | new
CHANGELOG.md                                | +~20 lines in [Unreleased] only
.github/pr-body-temp-test-cleanup.md        | new (this draft)
```

6 file entries. No churn in `package.json`, `package-lock.json`,
`Makefile`, `docs/_meta/registry.yaml`, `.github/workflows/`,
`scripts/`, or `workshop/`.

## CHANGELOG correction (and why it mattered)

The v2.1.0-workshop release notes recorded as a "known issue" that
19 vitest failures existed at HEAD in
`tests/meta/phase-a-findings-schema.test.ts`. Re-verification on
canonical HEAD `15cd046` with a clean working tree shows **393/393
passing**.

The failures only ever manifested inside an orchestrator loop that
rotated the active `.orchestrator/` dir to a `.bak-*/` snapshot.
Because `.orchestrator/phase-A-findings.md` was tracked at HEAD but
physically absent from the rotated working tree, the schema test
reported 19 assertion failures. That was a working-tree artifact of
loop tooling, not a product regression.

The `### Corrections` block under `[Unreleased]` documents this so
future readers of the v2.1.0-workshop tag aren't misled. This chore
also removes the coupling permanently by archiving the report into
`docs/archive/`, where no test or loop rotation can orphan it.

The tagged CHANGELOG blocks `[2.1.0-workshop]` and `[2.0.0-modernize]`
are byte-identical to `15cd046` — only `[Unreleased]` was edited.

## Workshop arc untouched

No files under `workshop/`, `tests/workshop/`, or `scripts/` are
modified. The workshop a11y, slide-minutes, curriculum-sync, and
rehearsal tests all still run and still pass (`75 passed`). The
content-release surface for the advanced Copilot CLI workshop is
unchanged by this PR.
