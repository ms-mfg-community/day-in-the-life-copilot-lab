# Lab spec — `labs/lab-gh-extensions.md`

| | |
|---|---|
| **Lab** | `labs/lab-gh-extensions.md` (387 lines) — "Building a GitHub CLI Extension that Calls an LLM" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-15) |
| **Last updated** | 2026-10-15 |

---

> **Merge decision:** standalone, and emphatically so. See `specs/labs/lab06.md` §0. This
> lab's §4 opens by warning the reader not to conflate a git hook with a Copilot CLI hook;
> folding it into the hooks cluster would manufacture that exact confusion. No lab number
> moves; R3 does not apply.

## 1. Target state

The learner builds `gh clab`, an interpreted Node `gh` extension that summarizes a diff by
calling an LLM, runs it three ways (GitHub Models / OpenAI / mock), wires it into a git
`pre-commit` hook, and learns the distribution model. The teaching idea is that a `gh`
extension is just a shebanged script on `PATH` — no compile step, no release pipeline, auth
inherited from `gh auth` — and that `gh extension`, Copilot CLI extensions and `gh-aw` are
three different things wearing the same word.

The lab is well-sourced and its mock path makes it runnable with zero credentials, which is
its best property. After the refresh it keeps all of that, and fixes three things: an
**unsourced token-budget number** presented as fact, a **`pre-commit` step that silently
clobbers an existing hook** (and that cannot work at all from a git worktree), and a stale
enumeration of Copilot CLI hook events that duplicates — and now contradicts — Lab 06. No
new section, no change to the three-mode design, pacing unchanged.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — `gh` and shell throughout. Nothing in it requires VS Code or github.com's web UI. |
| **Tier** | `intermediate` |
| **Presenter minutes** | 12 (unchanged) |
| **Self-paced minutes** | 30 (unchanged) |
| **Prerequisites** | `setup` (the learner needs `gh` authenticated and Node ≥ 20 on PATH — §3.3 and §2 both depend on it). Lab 06 is a useful-but-not-required companion for §4's git-hook-vs-Copilot-hook distinction. `lab-copilot-cli-extensions.md` is a **sibling**, explicitly not a prerequisite in either direction. |
| **Write steps** | **Yes — and unlike the rest of the batch, several land outside the repository entirely.** (a) §3.1 `gh extension create clab` in `/tmp`. (b) §3.3 `gh extension install .` — installs into the user's `gh` profile (`~/.local/share/gh/extensions/`, `%LOCALAPPDATA%` on Windows) **by symlink**. (c) §3.3 `gh extension install github/gh-models` — a global install requiring network and an authenticated token. (d) §4 `cat > .git/hooks/pre-commit` + `chmod +x` — writes into the **git directory**. (e) §4 and §3.3 run the extension, which makes outbound LLM calls unless `--mock`. (f) §4's 💡 callout runs `gh pr diff <pr-number>` — a network read. |
| **`lab-forge` verdict** | **`run with §7 fenced`** — every change §6 asks for is prose, a guard line in one code fence, and a cross-reference. None of (a)–(f) needs to execute. All are enumerated in §7. |

> 🚨 **(d) is the sharpest item in the whole batch, for a reason specific to this
> workstation.** `.git/hooks` lives in the **common** git directory and is **shared by every
> worktree**: `git -C <any worktree> rev-parse --git-path hooks` resolves to
> `C:/Users/johnhain/Documents/day-in-the-life-copilot-lab/.git/hooks` (verified
> 2026-10-15). Writing a `pre-commit` hook from inside a fanout worktree would arm it for
> the main checkout and for the live `_wt-spa*` Teaching-SPA worktrees as well. Worse, the
> lab uses `cat >`, which **overwrites without asking**; `.git/hooks/` currently holds no
> non-sample hooks, so there is nothing to destroy *today* — that is luck, not a safeguard,
> and exactly the reasoning `specs/labs/lab10.md` §7 flagged.
>
> Note the second-order effect: inside a worktree `.git` is a **file**, not a directory, so
> `cat > .git/hooks/pre-commit` fails outright with a "Not a directory" error. The command
> is therefore both dangerous in the main checkout and broken in a worktree — which is
> itself worth one sentence to the reader.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` — **no-op for this file; see `specs/labs/lab-hardening.md` D7.** AC8 is the real observation. |
| AC4 | The lab asserts no unsourced byte-or-token budget as a universal safe ceiling | `npx vitest run tests/lab-structure/lab-gh-extensions-contract` |
| AC5 | The `pre-commit` step does not unconditionally overwrite an existing hook — it guards or backs up first | `npx vitest run tests/lab-structure/lab-gh-extensions-contract` |
| AC6 | The lab warns that `.git/hooks/` is shared across worktrees and that `.git` is a file inside one | `npx vitest run tests/lab-structure/lab-gh-extensions-contract` |
| AC7 | The lab does not carry its own stale enumeration of Copilot CLI hook events; it defers to Lab 06 | `npx vitest run tests/lab-structure/lab-gh-extensions-contract` |
| AC8 | Frontmatter is present with `title`/`lab_number`/`pace`, and declared pacing is internally consistent with the inline `⏱️` callout | `npx vitest run tests/lab-structure/lab-gh-extensions-contract` |
| AC9 | Every backticked repo-relative path the lab cites resolves on disk | `npx vitest run tests/lab-structure/lab-gh-extensions-contract` |
| AC10 | The three-way "extension" disambiguation survives — `gh extension` vs Copilot CLI extension vs `gh-aw` — and the mock path is still presented as credential-free | `npx vitest run tests/lab-structure/lab-gh-extensions-contract` |

> AC10 is a **guard**. §6's accuracy sidebar and the `--mock` escape hatch are the two
> things that make this lab usable in a restricted room. Neither may be lost.

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | **"60 KB is a safe ceiling for current general-purpose chat models (~15K tokens of code-shaped text)"** (§4 💡 callout) | `cut` | A vendor-shaped number with no source in the file and no link. It is also model-dependent and moves — exactly the trap `specs/labs/lab10.md` C2 cut ("≈ 1/15×", "30–40 % more expensive"). **Keep the technique** — deterministically slicing the diff with `head -c` instead of letting it truncate mid-hunk — and keep the paginate-by-file fallback. Drop the "safe ceiling" framing and the token equivalence; present `60000` as *an example cap you choose and tune*, not as a published limit. |
| C2 | Three official extension types (interpreted / precompiled Go / precompiled other), and the `gh-` prefix rule | `free-check` | Both claims are sourced inline to `…/github-cli/github-cli/creating-github-cli-extensions` and `…/using-github-cli-extensions`, and both are long-stable surfaces of `gh` itself. Incidental to the lesson and already cited. No change. |
| C3 | "`gh extension create clab` … is **not** interactive in current `gh` versions — it scaffolds a bash script by default" | `free-check` | Verifiable at zero cost by the learner at the moment they run it, and the lab's next line tells them what to expect. Self-correcting. No change. |
| C4 | "The `gh-models` extension calls the **GitHub Models** inference API, which is in **public preview** and may require an allowlist" | `free-check` | The *conditional* half is correctly hedged and is the part that matters operationally ("may require an allowlist", symptoms given, `--mock` offered as fallback). The flat "is in public preview" is a GA-status assertion with no source and no date. Soften to the hedge the rest of the paragraph already uses, or date-stamp it. Do **not** research it: the lab works identically either way, because §3.3 routes failures to `--mock`. |
| C5 | "`gh-aw` … uses `gh extension` only as a delivery mechanism … no canonical `docs.github.com` page. Source: github.com/githubnext/gh-aw" | `free-check` | `docs/_meta/registry.yaml` carries `gh_aw_schema_version: "0.86.2"` with the install command `gh extension install github/gh-aw --pin v0.86.2`, and this repo runs gh-aw workflows. The lab already tells the reader to "verify against the repo README". Honest as written; no change. |
| C6 | "Copilot CLI hooks (`preToolUse`, `postToolUse`, `userPromptSubmitted`, `sessionStart`, `errorOccurred`) are a different surface" (§4 opening callout) | `free-check` | The *distinction* is correct and is the callout's whole point. The *enumeration* is five of fourteen events (see `specs/labs/lab06.md` C3) and duplicates a list this lab does not own. Replace the parenthetical with a pointer to `lab06.md`, which is already linked in the same sentence. One less place to go stale. |
| C7 | `gh extension install .` symlinks rather than copies, so a branch switch mutates the live extension | `free-check` | Already stated by the lab, with the footgun, the mitigation and the reason it scaffolds in `/tmp`. This is good material and is the kind of warning §4 is missing. **Keep verbatim** — and mirror its tone when writing the AC6 warning. |

**No `research` disposition.** C1 and C4 are cuts/softenings, C6 is a cross-reference, and
the rest are cited in-file or settled by the registry.

## 5. Non-goals

- Do not change the three-mode design or the mock-first posture. `--mock` is what makes the lab runnable without credentials, and §0 of the lab promises it.
- Do not convert the git `pre-commit` hook into a Copilot CLI hook, or add Copilot CLI hook content. That is Lab 06's and `lab-copilot-cli-extensions`'s material, and §4's warning exists to keep them apart.
- Do not edit `solutions/lab-gh-extensions/gh-clab/*`. `tests/extensions/gh-clab.test.ts` pins that implementation; the lab's prose is what is under review.
- Do not edit `labs/lab06.md`, `labs/lab-hardening.md` or `docs/copilot-config-reference.md` — all are owned by sibling specs in this same batch and are being edited in parallel worktrees.
- Do not edit `docs/_partials/cleanup.md`.
- Do not add a release-pipeline exercise. §5 deliberately scopes tagged releases to prose.
- Do not add this lab to `README.md` or the registry — see `specs/labs/lab-hardening.md` D7; it is a repo-wide decision, not this lab's pass.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | §4, 💡 "Reviewing PR diffs" callout | "60 KB is a safe ceiling for current general-purpose chat models (~15K tokens of code-shaped text)" — unsourced vendor-shaped number stated as fact. See C1. |
| D2 | §4, `cat > .git/hooks/pre-commit` fence | Overwrites any existing `pre-commit` hook with no check and no backup. A reader with a working hook — `husky`, `pre-commit`, `lefthook`, or this repo's own `scripts/hooks/pre-commit-strip-notebook-outputs.sh` — loses it silently. |
| D3 | §4, same fence | No warning that `.git/hooks/` is shared by every worktree of the repository, nor that `.git` is a *file* inside a worktree, which makes the redirect fail there. Verified 2026-10-15. |
| D4 | §4 opening callout | Enumerates five Copilot CLI hook events. Five of fourteen, and it duplicates a list Lab 06 owns — which this lab links in the same sentence. |
| D5 | §3.3, 🔐 callout | "the **GitHub Models** inference API, which is in **public preview**" — a flat GA-status claim, undated and unsourced, inside a paragraph that otherwise hedges correctly. |
| D6 | §6 table, "Copilot CLI extensions" row | Cites `labs/lab-copilot-cli-extensions.md` as "(workshop lab)" with no canonical docs link, which is accurate. Keep; listed here so the editing stage does not "fix" it into a fabricated docs URL. |
| D7 | repo-wide | Not covered by `labs-have-frontmatter.test.ts` or `registry-consumed.test.ts` (both filter `/^lab\d+\.md$/`); absent from `README.md`; no registry `labs:` entry. Shared with the other two named labs — see `specs/labs/lab-hardening.md` D7. |

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED rather than executing them. Several mutate state
**outside the repository working tree**, which is the category `specs/labs/lab10.md` was
written to catch.

- **§3.1** — `cd /tmp` + `gh extension create clab`. Creates a directory outside the repo.
- **§3.2** — `cp "$WORKSHOP/solutions/…" ./gh-clab` + `chmod +x`, outside the repo.
- **§3.3** — `gh extension install .`. **Installs into the user's `gh` profile by symlink**, where it persists after the run and shadows any same-named extension.
- **§3.3** — `gh extension install github/gh-models`. Global install; needs network and an authenticated `gh` token; may be allowlist-gated.
- **§3.3 / §4** — `gh clab`, `gh clab --mock`, and the pre-commit hook body. Non-mock paths make outbound LLM calls and spend tokens.
- **§4** — `cat > .git/hooks/pre-commit` + `chmod +x .git/hooks/pre-commit`. **Writes into the shared git directory**; see the §2 callout. Must not execute under any circumstances while the `_wt-spa*` worktrees are live.
- **§4 💡 callout** — `gh pr diff <pr-number> --patch`. Network read against GitHub.
- **Implied cleanup** — `gh extension remove gh-clab`, named in §3.3's callout. A global uninstall.
- **Cleanup (shared partial)** — step 1 kills background jobs; step 5 runs `git config --unset core.hooksPath`; step 4 lists `.git/CLAB_SUMMARY.md`, this lab's own artifact.

> The edit this lab needs is a cut, a guard line, a warning and a cross-reference. None of
> it requires installing anything, so the verdict is `run with §7 fenced` rather than
> `do not run`.
