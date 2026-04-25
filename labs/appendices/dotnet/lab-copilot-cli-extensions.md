---
title: ".NET Appendix — Copilot CLI Extensions Lab"
lab_number: "cli-extensions"
track: dotnet
parent_lab: lab-copilot-cli-extensions.md
---

# .NET Appendix — `lab-copilot-cli-extensions`

This appendix is a track-specific completion path for [`labs/lab-copilot-cli-extensions.md`](../../lab-copilot-cli-extensions.md). The base lab is language-agnostic; this page wires `clab_summarize` into the **ContosoUniversity .NET workflow** so the extension earns its place in a real .NET inner loop.

> Pair with: [`labs/appendices/node/lab-copilot-cli-extensions.md`](../node/lab-copilot-cli-extensions.md) for the Node-track equivalent.

## Where it pays off in .NET work

`clab_summarize` is a model-backed bullet summarizer. The high-value use cases in a `dotnet` repo are:

1. **Summarize the diff before review.** After `dotnet build` + `dotnet test` pass, ask the agent: *"Summarize the changes in `git diff origin/main -- dotnet/ContosoUniversity.Web` using clab_summarize."* You get a five-bullet PR description ready to paste — and the `preToolUse` deny-large-input hook keeps a sprawling diff from blowing your token budget.
2. **Summarize a long stack trace.** ASP.NET Core stack traces with EF Core inner exceptions are 40+ lines of noise. `clab_summarize` collapses them to *"NullReferenceException in `EnrollmentController.Create` at line 42; root cause is the Department lookup returning null when the form posts a stale `DepartmentID`."*
3. **Summarize an integration-test log run.** `dotnet test --logger "console;verbosity=detailed"` produces verbose XML; pipe the failures into `clab_summarize` and get a triage list.

Each of these is a place where **the deterministic gate matters**: PR diffs and verbose test logs are exactly the inputs that exceed the 10 KB cap, and you want the cap to bite *before* the model runs.

## .NET-flavored smoke test

```bash
# from the repo root, after extensions_reload({})
dotnet test dotnet/ContosoUniversity.sln --logger "console;verbosity=detailed" 2>&1 | tee test-output.log
```

Then in `copilot`:

> *"Read `test-output.log` and summarize the failing tests using clab_summarize."*

The agent calls `clab_summarize` with the log as `text`. If the log is over 10 KB the `preToolUse` hook denies the call with the exact reason you saw in the base lab — at which point the agent will typically split the input or fall back to a different approach. Both behaviors are correct; the gate did its job.

## Pair with the .NET build hook from Lab 06

If you have already completed [Lab 06 — Hooks](../../lab06.md) and installed the `post-tool-use-dotnet-build.sh` hook, the sequence becomes:

1. Agent edits a `.cs` file → `postToolUse` runs `dotnet build`.
2. Build output is verbose → user prompts *"summarize: the build output above"*.
3. `userPromptSubmitted` hook detects the `summarize:` trigger and emits an audit line.
4. Agent calls `clab_summarize` on the build output.
5. If the build log is huge, `preToolUse` denies; otherwise the model produces the summary.

That is the four-hook synergy story in a single round-trip — three deterministic surfaces (build hook, trigger detector, size gate) bracketing one probabilistic body (the summarizer LLM call).
