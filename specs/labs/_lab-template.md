# Lab spec — `labs/<lab>.md`

> Copy this file to `specs/labs/<lab-file-stem>.md` and fill it in. Keep it to one or
> two pages. This is **not** the research-spec template (`specs/_template.md`) — that one
> verifies facts about the outside world and costs a `spec-forge` run. This one is the
> **contract `lab-forge` consumes**, it is written by hand, and it is mandatory:
> `lab-forge` refuses to start without a `specPath` (`loop.mjs:650`), and its edit, run,
> teachability and judge stages each re-derive what "done" means from this file.
>
> Delete every instruction block (`>`) as you fill it in.

| | |
|---|---|
| **Lab** | `labs/<lab>.md` |
| **Spec state** | `draft` \| `ready` |
| **Author** | |
| **Last updated** | YYYY-MM-DD |

---

## 1. Target state

> Two or three sentences. What should a reader be able to do after this lab that they
> cannot do now, and what is the lab's single teaching idea? Write the destination, not
> the diff — `lab-forge`'s editing stage derives the change from the gap between this and
> the current file.

## 2. Declared surface

> These four are what the teachability gate checks. Every one must be a claim about the
> learner's experience that a reader could falsify, not an aspiration.

| | |
|---|---|
| **Surface** | `vs-code-only` \| `cli` \| `github.com` \| `mixed` |
| **Tier** | `beginner` \| `intermediate` \| `advanced` |
| **Presenter minutes** | |
| **Self-paced minutes** | |
| **Prerequisites** | Labs that must come first, and why — not a courtesy list |
| **Write steps** | `none`, or enumerate every command that writes to GitHub, installs globally, or needs a GUI. **A lab with write steps is rehearsed by a person; `lab-forge` is not run on it.** |

## 3. Acceptance criteria

> The load-bearing section. Each row is one observable fact and the **named command that
> observes it**. The run gate executes these; the judge re-derives its verdict from them.
>
> "The lab is clearer" is not a criterion. "Every model named in the lab appears in
> `docs/_meta/registry.yaml`" is, because a command can decide it.
>
> Keep `AC1`–`AC3` below verbatim — they apply to every lab. Add lab-specific rows after.

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | | |

## 4. Outside-world claims

> Every statement the lab makes about product behaviour, availability, limits, versions or
> names. For each, pick exactly one disposition. **This table is the research gate** — it is
> where a `spec-forge` run is justified, and where most of them are avoided.
>
> - `free-check` — a named command or file in this repo settles it. Give the command.
> - `cite F-nn` — already VERIFIED in `specs/001-research-sota/`. Give the row.
> - `research` — nothing free settles it and the lab depends on it. This is the only
>   disposition that costs credits. Name the topic for the `spec-forge` run.
> - `cut` — the claim is incidental. Delete the sentence. Usually the right answer.

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | | | |

## 5. Non-goals

> What this lab must **not** grow into. The editing stage treats anything here as
> out of bounds, which is how a lab refresh avoids becoming a rewrite.

- 

## 6. Known defects

> Specific, located problems already found in the current file. Line numbers where you
> have them. This is the editing stage's worklist.

| # | Location | Problem |
|---|---|---|
| D1 | | |

## 7. Out of scope for `lab-forge`

> Anything in §2's write steps, plus any step needing credentials, a GUI, or network
> writes. The run gate reports these as UNVERIFIED rather than executing them, so naming
> them here keeps a green run honest.

- 
