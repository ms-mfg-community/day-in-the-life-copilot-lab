---
title: "Node Appendix — Copilot CLI Extensions Lab"
lab_number: "cli-extensions"
track: node
parent_lab: lab-copilot-cli-extensions.md
---

# Node Appendix — `lab-copilot-cli-extensions`

This appendix is a track-specific completion path for [`labs/lab-copilot-cli-extensions.md`](../../lab-copilot-cli-extensions.md). The base lab is language-agnostic; this page wires `clab_summarize` into a typical **Node.js / TypeScript** inner loop so the extension earns its place in a real Node workflow.

> Pair with: [`labs/appendices/dotnet/lab-copilot-cli-extensions.md`](../dotnet/lab-copilot-cli-extensions.md) for the .NET-track equivalent.

## Where it pays off in Node work

`clab_summarize` is a model-backed bullet summarizer. The high-value use cases in a Node/TS repo are:

1. **Summarize the diff before review.** After `npm test` + `npm run build` pass, ask the agent: *"Summarize the changes in `git diff origin/main -- src/` using clab_summarize."* You get a five-bullet PR description ready to paste — and the `preToolUse` deny-large-input hook keeps a sprawling diff from blowing your token budget.
2. **Summarize a `vitest` / `jest` failure run.** A failing `npm test` produces dozens of lines per failure (assertion diffs, stack traces, console output). `clab_summarize` collapses the run to *"3 failures in `auth.spec.ts`; common root cause is the `currentUser` mock returning `undefined` when the test forgot `beforeEach(setUser)`."*
3. **Summarize TypeScript compiler errors.** `tsc --noEmit` against a refactor often emits 50+ TS2345/TS2322 lines that all stem from one type narrowing change; `clab_summarize` finds the through-line.

Each of these is a place where **the deterministic gate matters**: diffs and verbose `tsc` output are exactly the inputs that exceed the 10 KB cap, and you want the cap to bite *before* the model runs.

## Node-flavored smoke test

```bash
# from the repo root, after extensions_reload({})
npm test 2>&1 | tee test-output.log
```

Then in `copilot`:

> *"Read `test-output.log` and summarize the failing tests using clab_summarize."*

The agent calls `clab_summarize` with the log as `text`. If the log is over 10 KB the `preToolUse` hook denies the call with the exact reason you saw in the base lab — at which point the agent will typically split the input or fall back to a different approach. Both behaviors are correct; the gate did its job.

## Pair with a Node build hook

The repo's existing `postToolUse` formatter hook (Prettier on `.js`/`.ts` edits — see [Lab 06 — Hooks](../../lab06.md)) composes naturally:

1. Agent edits a `.ts` file → `postToolUse` runs Prettier.
2. Run `npm run build`; output is verbose → user prompts *"summarize: the build output above"*.
3. `userPromptSubmitted` hook detects the `summarize:` trigger and emits an audit line.
4. Agent calls `clab_summarize` on the build output.
5. If the build log is huge, `preToolUse` denies; otherwise the model produces the summary.

That is the four-hook synergy story in a single round-trip — three deterministic surfaces (formatter hook, trigger detector, size gate) bracketing one probabilistic body (the summarizer LLM call).

## A Node-only nuance: `extension.mjs` is itself Node code

Because Copilot CLI extensions **are** Node ES modules, this lab is the one place where Node-track participants can read the extension source as production code, not as scaffolding. Spend an extra minute reading [`solutions/lab-copilot-cli-extensions/.github/extensions/clab-summarize/extension.mjs`](../../../solutions/lab-copilot-cli-extensions/.github/extensions/clab-summarize/extension.mjs) — every line maps to a quoted section of the runtime authoring guide referenced in §2 of the base lab.
