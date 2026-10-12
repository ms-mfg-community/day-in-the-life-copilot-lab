# Lab spec — `labs/setup.md` + README setup sections

| | |
|---|---|
| **Lab** | `labs/setup.md` (40-line redirect stub) **plus** the setup sections of `README.md`: Pre-Workshop Setup Checklist, Prerequisites, Choose Your Path (Options A–D), Fork & Clone, Verify Copilot CLI, Troubleshooting. One target. |
| **Spec state** | `ready` |
| **Author** | John / Copilot (2026-10-12) |
| **Last updated** | 2026-10-12 |

---

## 1. Target state

A learner who has never seen the repo can reach a working environment — `copilot`, `gh`,
`gh aw` (Labs 08–09 only) and the repo's build/test commands all answering `--version` or
`test` — by following the README's setup sections alone, on any of the four paths. `labs/setup.md`
is a pointer to those sections and carries **no content that can drift**: it keeps the track /
test-command table and drops the lab catalogue blurb, which duplicates the README's *Lab Modules*
and is already wrong about how many labs exist.

The single teaching idea is **"setup is a checklist with an observable answer at each step"**:
every install step is paired with the command that proves it worked. This is a currency pass,
not a rewrite; no path is added or removed.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `mixed` — terminal (install, auth, verify), VS Code (Dev Containers), github.com (fork, Codespaces). |
| **Tier** | `beginner` |
| **Presenter minutes** | n/a — pre-work, not presented. `labs/setup.md` has no frontmatter and is outside the `lab\d+` frontmatter test; do not add any. |
| **Self-paced minutes** | 15–30, as the README already states (Option A 5–10, B/C ~15, D ~20). Not under review. |
| **Prerequisites** | None. This is the entry point. |
| **Write steps** | **Yes, many. A person rehearses this; `lab-forge` must not execute any of it.** Global installs: `npm install -g @github/copilot`, `npm i -g pnpm`, `winget install …`, `brew install …`, `sudo apt-get install …`, `sudo snap install code --classic`. Extension install: `gh extension install github/gh-aw`. Authentication: `gh auth login`, `copilot login`. GitHub writes and GUI steps: fork the repo, enable Actions, create a Codespace, create a repo under an EMU account, `git remote set-url origin`, `git push --all origin`, `git push --tags origin`. Local: `podman machine init/start`, Dev Containers "Reopen in Container". |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | n/a — `setup.md` has no lab number, so `labs-have-frontmatter` does not cover it | — |
| AC4 | `labs/setup.md` does not enumerate the lab catalogue (no `Labs NN–NN` ranges, no `Lab NN` list) — the README's *Lab Modules* is the single source | `npx vitest run tests/lab-structure/setup-contract` |
| AC5 | Every `make <target>` named in `labs/setup.md` or README exists in `Makefile` | `npx vitest run tests/lab-structure/setup-contract` |
| AC6 | Every README setup `#anchor` that `labs/setup.md` links to resolves to a real README heading | `npx vitest run tests/lab-structure/setup-contract` |
| AC7 | The README states a Node.js floor of 22 or later for the `npm install -g @github/copilot` path, and no longer says "Node 18+" | `npx vitest run tests/lab-structure/setup-contract` |
| AC8 | The README Troubleshooting row for *Copilot CLI not authenticated* names `copilot login`, not `gh auth login` — the README's own Verify section says the CLI "does **not** use `gh auth`" | `npx vitest run tests/lab-structure/setup-contract` |
| AC9 | Every `git checkout <branch>` in the README names a branch that exists on `origin` | `git ls-remote --heads origin <branch>` — **needs network; read-only; not in the vitest file** |

## 4. Outside-world claims

| # | Claim as the setup sections state it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | `npm install -g @github/copilot` needs "Node 18+" (README ~41, ~65) | `free-check` — **FALSE** | GitHub Docs *Installing GitHub Copilot CLI*, opened 2026-10-12: "Prerequisite: Node.js 22 or later." `npm view @github/copilot engines` returns nothing, so the registry does not settle it; the docs page does. Fix to 22+. See D1 and §5. |
| C2 | `copilot login` authenticates the CLI; it uses its own auth, not `gh auth` | `free-check` | `copilot login --help` — "Authenticate with Copilot via OAuth." Correct as written. |
| C3 | Alternative auth: `GH_TOKEN` with a fine-grained PAT carrying **Copilot Requests** | `free-check` | Same docs page: `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN`, in that precedence, fine-grained PAT on a **user-owned** token. Correct; optionally name the precedence. |
| C4 | `gh extension install github/gh-aw` then `gh aw version` | `free-check` | `.devcontainer/post-create.sh` installs it the same way; registry `gh_aw_schema_version`. Correct. |
| C5 | Devcontainer includes ".NET 8 + 9 SDKs, Node.js, GitHub CLI, Copilot CLI, gh-aw, jq" | `free-check` | `.devcontainer/devcontainer.json` (image dotnet:8.0 + feature dotnet 9.0, node 20, pnpm, github-cli) and `.devcontainer/post-create.sh` (copilot, gh-aw, jq). Claim holds. **Note:** the container's Node is 20, below C1's floor — see §5. |
| C6 | `winget install Microsoft.DotNet.SDK.8` / `GitHub.cli` / `OpenJS.NodeJS.LTS` / `Microsoft.VisualStudioCode`; `brew install dotnet-sdk` / `gh` / `node` | `cut` for package ids the lab does not depend on; otherwise `research` is **not** justified | The ids are platform-vendor install conveniences, each followed by a download link. Keep the link, keep the command only if the line is otherwise unchanged. Do not spend a run on winget/brew catalogue state. |
| C7 | The Copilot CLI can be installed other ways (WinGet `GitHub.Copilot`, Homebrew `--cask copilot-cli`, install script) | `free-check` | Same docs page. Not currently in the README. **Do not add** — see §5. |
| C8 | `git checkout feature/modernize` after cloning | `free-check` | `git ls-remote --heads origin feature/modernize` returned a ref on 2026-10-12 (AC9). Whether it should still be the entry branch is a product decision, not a currency defect. Leave. |
| C9 | Codespaces "5–10 min", Docker "~15 min", etc.; "Setup takes 15–30 minutes" | `cut` or leave | Pacing claims, unsourced. Not under review (§5). |
| C10 | Dev Containers extension id `ms-vscode-remote.remote-containers`; `dev.containers.dockerPath` / `dockerSocketPath` settings | `research` is **not** justified | Linked marketplace page is the source. Leave as is. |
| C11 | Podman CA-certificate link (`containers/podman/blob/main/docs/tutorials/…`) | `free-check` | Link target is checkable by `web_fetch`; `links-resolve` does not cover external URLs. Typos in the prose ("organizaiton", "Vitual Maching") are in scope as mechanical fixes. |

## 5. Non-goals

- Do not add or remove a setup path. Options A–D stay; the order and anchors stay.
- Do not add the WinGet / Homebrew / install-script ways to install Copilot CLI (C7). The npm path is what the repo's scripts and devcontainer use.
- Do not edit `scripts/preflight.sh`, `scripts/preflight.ps1`, `.devcontainer/*` or `Makefile`. **Known, parked, not for this run:** preflight still tells learners "Install Node.js 18+" and the devcontainer pins Node 20, both below C1's floor of 22. They are separate files with their own test surface; record them, do not fix them here.
- Do not move setup content back into `labs/setup.md`. The stub-pointing-at-README shape is deliberate.
- Do not change pacing, the `feature/modernize` checkout instruction, or the EMU clone flow.
- Do not touch any lab other than `labs/setup.md`. Do not edit any file under `tests/`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | README ~41 and ~65 | "Node 18+" / "(v18+)" for the Copilot CLI install. Docs say Node.js 22 or later (C1). Both occurrences, plus the preflight-FAIL table row for `node not found`. |
| D2 | README ~702 | Troubleshooting says "Copilot CLI not authenticated → Run `gh auth login`". The README's own Verify section says the opposite. Should be `copilot login`. |
| D3 | `labs/setup.md` 17–35 | Lab-catalogue blurb: "Labs 01–10 cover the core agentic surface … Labs 15–20 are the 2026 modernization track". Stale (the repo has more labs than 20), duplicates README *Lab Modules*, and is the only content in the stub that can drift. Delete it. |
| D4 | `labs/setup.md` 1–15 | Redirect stub has no intro sentence saying what the page is for, and the "Quick reference" table sits inside a blockquote. Mechanical tidy only; keep both links and the table. |
| D5 | README ~278, ~285, ~332, ~339 | `git checkout feature/modernize` — branch exists (C8). No change; recorded so a reviewer does not "fix" it. |
| D6 | README ~189 | Typos: "organizaiton", "Vitual Maching", "certification" for certificate. Mechanical. |
| D7 | README ~13 | "Setup takes 15–30 minutes" vs. Option A "5–10 min" — consistent ranges, not a defect. No change. |

## 7. Out of scope for `lab-forge`

**None of the §2 write steps may be executed by any stage.** The run gate must report each
one UNVERIFIED — not "could not run", UNVERIFIED — and the edit stage must not run them to
"check" a change. Specifically:

- every global install in §2 (`npm install -g …`, `npm i -g pnpm`, `winget`, `brew`, `apt-get`, `snap`);
- `gh extension install github/gh-aw`, `gh auth login`, `copilot login`, `copilot -p "hello"`;
- every GitHub-side step: fork, enable Actions, Codespaces, `git push`, `git remote set-url`, repo creation;
- `podman machine …`, `systemctl --user …`, anything that needs Docker or a Dev Container;
- `scripts/preflight.sh` and `pwsh scripts/preflight.ps1` — read-only in intent, but they probe the host toolchain; read them, do not run them.

**May** be executed, because they are read-only and local: `npm test`, the three vitest
invocations in §3, `make -n <target>` (dry run), `copilot login --help`, `gh aw version`,
`git ls-remote --heads origin <branch>`, and plain file reads.

> There is no sandbox. `lab-forge` runs in the live working tree (`loop.mjs:889`); this
> section is the only thing standing between a green run and a global `npm install` on the
> maintainer's machine.
