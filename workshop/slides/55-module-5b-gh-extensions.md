---
module: M5b
title: "GitHub CLI extensions — `gh extension`"
anchor_labs: [lab-gh-extensions]
minutes: 15
phase: 3c
---

# M5b — Building a `gh` extension that calls an LLM

## The advanced problem

You already install `gh` extensions (`gh copilot`, `gh models`, `gh-aw`). The
advanced question is: **how do you ship your own `gh` command that calls an
LLM, works without credentials in a workshop, and wires cleanly into a git
hook?** That is exactly what this module builds: `gh clab` — an interpreted
Node extension that summarizes the working-tree diff into a structured
changelog.

Anchor lab: [`labs/lab-gh-extensions.md`](../../labs/lab-gh-extensions.md).
Reference solution: `solutions/lab-gh-extensions/gh-clab/`.

---

## The three official extension types — read this before writing any code

`docs.github.com` enumerates exactly three categories. Node is **not** its own
category; it is a flavor of *interpreted*.

| Type                     | `gh extension create` flag               | Distribution                                      |
|--------------------------|------------------------------------------|---------------------------------------------------|
| **Interpreted**          | *(default — bash scaffold)*              | Script at repo root, runnable via shebang.        |
| **Precompiled in Go**    | `--precompiled=go`                       | Release binaries `gh-<name>-<os>-<arch>[.exe]`.   |
| **Precompiled, other**   | `--precompiled=other`                    | You author the build script the scaffold drops at *script/build.sh*; same binary naming. |

**The `gh-` rule.** Repo/directory name must start with `gh-`. The prefix is
stripped to form the command: `gh-clab/` → `gh clab`.

Sources:
[Using GitHub CLI extensions](https://docs.github.com/en/github-cli/github-cli/using-github-cli-extensions),
[Creating GitHub CLI extensions](https://docs.github.com/en/github-cli/github-cli/creating-github-cli-extensions).

---

## Why interpreted Node is the right shape for *this* lab

Shebang + `chmod +x` is all the runtime contract you owe. For a
workshop-grade LLM-powered CLI:

- **No compile step.** Edit, re-run, ship. Exactly like a bash hook.
- **Shells out to `gh models run`** for completions — auth inherits from
  `gh auth`, so there is no API key surface to teach.
- **Shells out to `gh api`** for REST/GraphQL — same auth story.
- **Portable.** Any attendee with Node ≥ 20 on PATH runs the same file.

The *cost* of interpreted: every user needs the interpreter installed. For a
Copilot/GitHub-Models workshop that is an entirely reasonable floor.

---

## Three modes, one script — the "no credentials" contract

GitHub Models availability is unknown per attendee. The extension must still
be teachable end-to-end. `gh clab` therefore ships three runtime modes,
selected automatically in priority order:

```
1. gh models run <model> "<prompt>"         ← primary, auth via gh auth
2. OpenAI-compatible fetch()                 ← OPENAI_API_KEY or AZURE_OPENAI_*
3. Mock (canned structured output, exit 0)  ← GH_CLAB_MOCK=1 or --mock, or both upstreams missing
```

The selection logic is ≤ 30 lines — fallback handling never dominates the
teaching surface. `--mock` is the documented "no credentials" path: every
section of the lab runs end-to-end with zero secrets.

---

## The install / invoke / hook loop, in commands

```bash
# Local install — cwd must be a gh-<name>/ directory
gh extension install .
gh extension list | grep gh-clab

# Exercise (no credentials)
gh clab --mock

# Wire into a git pre-commit hook (NOT a Copilot CLI hook — different surface)
cat > .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
gh clab --mock --allow-empty > .git/CLAB_SUMMARY.md || true
HOOK
chmod +x .git/hooks/pre-commit
```

One command to install, one to invoke, three lines to wire. That is the
mechanism.

---

## Distribution — local vs tagged release

Two modes matter in production; only the first is in scope for this lab.

- **Local install** — `gh extension install .`. Perfect for internal tools,
  prototypes, and this workshop. No release needed.
- **Tagged release** — `gh extension install owner/repo`. Pulls the latest
  tag. For precompiled extensions the release must attach binaries named
  `gh-<name>-<os>-<arch>[.exe]`. Interpreted extensions (this lab) need no
  binaries — the shebang'd script is the release.

`gh extension upgrade` and `gh extension remove` round out the lifecycle.

---

## Accuracy sidebar — three things that sound alike, aren't

The word "extension" is overloaded. Do not conflate these surfaces:

| Surface                  | Runs where                              | Canonical docs                                                                                   |
|--------------------------|------------------------------------------|---------------------------------------------------------------------------------------------------|
| **`gh extension`** (this module) | External process, invoked by `gh`        | [docs.github.com/en/github-cli/github-cli/using-github-cli-extensions](https://docs.github.com/en/github-cli/github-cli/using-github-cli-extensions) |
| **Copilot CLI extensions** | *Inside* the Copilot CLI agent process   | Module M5c — `labs/lab-copilot-cli-extensions.md`                                                 |
| **`gh-aw`** (Agentic Workflows) | Installed via `gh extension`; compiles to Actions YAML | Repo only — no canonical docs.github.com page. <https://github.com/githubnext/gh-aw>             |

Three surfaces, three runtimes, three authoring models. Teach them side-by-side
once, then keep them separate for the rest of the workshop.

---

## Expected failure modes

- **Repo/directory name missing the `gh-` prefix.** `gh extension install`
  refuses. Rename to `gh-<name>/` and retry.
- **Interpreter not on PATH.** For Node extensions the user needs Node ≥ 20.
  The shebang fails silently otherwise; document the floor in your README.
- **`gh models` not installed.** `gh clab` falls through to OpenAI, then mock.
  No crash — but if you *expect* the primary path, add
  `gh extension install github/gh-models` to your setup step.
- **Teaching `gh-aw` as a Microsoft-documented feature.** It isn't — the docs
  live in the repo. Cite the repo, not `docs.github.com`.
- **Wiring `gh clab` into a Copilot CLI hook and calling it a git hook (or
  vice versa).** They are different surfaces. This lab uses a **git**
  `pre-commit` hook; Copilot CLI hooks are covered in Lab 06 and M5c.

---

## Takeaway

`gh extension` is the mechanism. Interpreted Node is the shape. `gh models` +
`--mock` is the "works with or without credentials" contract that makes the
lab teachable. The next module (M5c) covers the *other* extension surface —
Copilot CLI extensions, which run inside the agent process — so learners leave
able to distinguish the two.
