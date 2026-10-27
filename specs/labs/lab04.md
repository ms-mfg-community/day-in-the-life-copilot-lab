# Lab spec — `labs/lab04.md`

| | |
|---|---|
| **Lab** | `labs/lab04.md` (131 lines) — "Skills & Prompts" |
| **Spec state** | `ready` |
| **Author** | John / Copilot (2026-10-12) |
| **Last updated** | 2026-10-12 |

---

## 1. Target state

After this lab a learner can tell a **skill** from a **prompt file** on the two axes that
actually distinguish them — *where each one works* and *how each is named* — and can prove
a skill is loaded with a command rather than by guessing from an answer. The single
teaching idea is *"skills travel with the agent everywhere and Copilot picks them, prompt
files are an IDE-only convenience you type by name."*

This is a correctness pass. The lab currently teaches the wrong distinction (auto versus
explicit), the wrong invocation character (`@` instead of `/`), and contradicts itself in
two near-duplicate callouts. Every section stays; the claims inside them get corrected.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `mixed` — §4.1–§4.2 and §4.4's skill work are `cli`; the prompt-file invocation in §4.3/§4.4 is **IDE-only** and cannot be done from the CLI at all (C1). The lab must stop pretending otherwise. |
| **Tier** | `beginner` |
| **Presenter minutes** | 4 (unchanged) |
| **Self-paced minutes** | 15 (unchanged — see §5) |
| **Prerequisites** | Setup complete (`labs/setup.md`). §4.3/§4.4's prompt step additionally needs VS Code, Visual Studio or a JetBrains IDE with Copilot Chat — the lab declares no prerequisite today. |
| **Write steps** | **Yes, two families — both write *tracked files in this repository*.** (a) the appendix heredoc creates `.github/skills/dotnet-testing/SKILL.md`, which **already exists and is overwritten** (C8); (b) it creates `.github/prompts/create-dotnet-test.prompt.md`. Plus §4.4 starts an interactive `copilot` session and runs two model probes. A person rehearses these; **`lab-forge` must not execute any of them** (§7). |

> **The "no write steps" survey was wrong about this lab too.** Like lab02, lab04 scans
> clean for GitHub writes, global installs and home-directory paths, and like lab02 it
> writes tracked repository files — here including a skill file that the running agent may
> itself load. Two of the five labs in the "safe" tier are not write-free. Read the
> appendix commands, not just the lab body.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | No `@`-prefixed invocation form survives — not `@prompt-name`, `@name`, `@create-dotnet-test` or `@create-node-test` — and the `/`-prefixed forms are present | `npx vitest run tests/lab-structure/lab04-contract` |
| AC5 | The "Skills vs Prompts" callout appears **once**, not twice with conflicting characters | `npx vitest run tests/lab-structure/lab04-contract` |
| AC6 | §4.1 no longer asserts skills cannot be invoked, and names the documented `/skill-name` form | `npx vitest run tests/lab-structure/lab04-contract` |
| AC7 | §4.4's interactive CLI session runs the track's command skill (`/create-dotnet-test`) itself; no step is sent to an IDE, and the lab still records that `.prompt.md` files are IDE-only | `npx vitest run tests/lab-structure/lab04-contract` |
| AC8 | The unsourced "max 1024 chars" description limit is gone | `npx vitest run tests/lab-structure/lab04-contract` |
| AC9 | §4.2 states that `dotnet-testing` already ships in this repo, so the step overwrites it | `npx vitest run tests/lab-structure/lab04-contract` |
| AC10 | The lab names a deterministic skills command (`/skills list` or `/skills info`) as the way to confirm loading | `npx vitest run tests/lab-structure/lab04-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | L59 note: prompt files are **IDE-only**; Copilot CLI exposes no `@prompt-name` or `/prompt-name` for user-authored prompt files | `free-check` — **CORRECT, and the rest of the lab ignores it** | GitHub Docs *Your first prompt file*, opened 2026-10-12: *"Prompt files are in public preview … **only available in VS Code, Visual Studio, and JetBrains IDEs**."* The note is right; L61, L63, L64, L68 and L95 all contradict it. |
| C2 | L61/L63/L64/L68: prompt files are "invoked with `@prompt-name`" / "`@name`" | `free-check` — **FALSE, wrong character** | Same doc, *Test it out* step 2: *"In Visual Studio Code, display the Copilot Chat view and enter **`/explain-code`**."* Prompt files are invoked with `/name`. The `@` form appears nowhere in the documentation. |
| C3 | L102: "Prompts are invoked explicitly with `/name`" | `free-check` — **CORRECT** | Same doc. Note this is the *duplicate* of the L68 callout and the two disagree with each other; L102 is the one to keep. |
| C4 | §4.1: "Skills … load **automatically** … **You don't invoke them** — they activate on their own" | `free-check` — **FALSE as stated** | GitHub Docs *Adding agent skills for GitHub Copilot CLI*, opened 2026-10-12, *Using agent skills*: *"To tell Copilot to use a specific skill, include the skill name in your prompt, **preceded by a forward slash**."* with the example `Use the /frontend-design skill to create a responsive navigation bar in React.` Automatic selection is real; "you don't invoke them" is not. |
| C5 | §4.1: progressive disclosure — only `name` and `description` are read upfront | `free-check` — directionally supported, not stated in those words | Same doc: *"When Copilot chooses to use a skill, the `SKILL.md` file will be injected in the agent's context"*, and selection is *"based on your prompt and the skill's description."* Loading-on-use is documented; the phrase "progressive disclosure" is the lab's own. Acceptable as framing, not as a quotation. |
| C6 | §4.5: `description` "drives auto-activation (**max 1024 chars**)" | `free-check` — **no published limit found** | Neither *About agent skills* nor *Adding agent skills for GitHub Copilot CLI* states any character limit; the documented frontmatter is `name` (required), `description` (required), `license` (optional) and `allowed-tools` (optional). No published guidance exists for a 1024 cap, so the lab must not assert one. Cut the parenthetical. |
| C7 | §4.5 prompt frontmatter: `description`, `mode: "agent"`, `tools` | `free-check` — **inconsistent, parked** | GitHub Docs' example uses `agent: 'agent'`; this repo's own prompts use `agent:` 16 times and `mode:` once; `solutions/lab04-skill-and-prompt/create-dotnet-test.prompt.md` uses `mode:` + `tools:`. Both keys appear in the wild and I could not settle which is current from a primary source. Correcting it spans the lab, both appendices and the solution file. **Parked — see §5.** |
| C8 | §4.2: "`mkdir -p .github/skills/<track>-testing`" presented as creating a new skill | `free-check` — **FALSE for the .NET track** | `.github/skills/dotnet-testing/SKILL.md` already exists on disk (`name: dotnet-testing`). `labs/appendices/dotnet/lab04.md:31-32` runs `mkdir -p` then `cat > …/SKILL.md`, **overwriting the shipped file** with a shorter body that then points at the shipped file "for the complete 9-section reference". §4.4's activation probe therefore passes whether or not the learner did anything. |
| C9 | §4.4: verification is "ask a question and see if the answer mentions your patterns" | `free-check` — **not the authoritative check** | Same CLI skills doc, *Skills commands in the CLI*: `/skills list`, `/skills info SKILL-NAME` ("including its location"), `/skills reload`, `/skills add`, `/skills remove`, and enable/disable via `/skills`. The terminal equivalents `copilot skill list|add|disable` also exist. A deterministic command exists, so a model probe is corroboration, not proof. |
| C10 | Skills work in Copilot CLI at all | `free-check` — correct | *About agent skills*: *"Agent skills work with Copilot cloud agent, Copilot code review, the GitHub Copilot CLI, the GitHub Copilot app, and agent mode in Visual Studio Code and JetBrains IDEs."* Project skills live in `.github/skills`. |
| C11 | Two reference URLs (L16–17) and the L59 doc link | `free-check` | All three returned **HTTP 200** on 2026-10-12. |
| C12 | Solutions links in §4.5 | `free-check` — correct | `solutions/lab04-skill-and-prompt/dotnet-testing/SKILL.md` and `…/create-dotnet-test.prompt.md` both exist on disk. |

## 5. Non-goals

- Do not change pacing (`presenter_minutes: 4`, `self_paced_minutes: 15`) or the registry's `lab04` rows. If a gate reports the 15 is wrong, that finding is **recorded, not fixed**.
- Do not renumber sections. `4.1`–`4.5` stay.
- Do not add or remove a section. Do not merge the two track bullets into one, and do not inline the appendix bodies into the lab.
- **Do not touch `mode:` vs `agent:` (C7.)** It is unsettled from primary sources, it spans four files, and a half-fix that leaves the lab disagreeing with its own solution file is worse than the status quo. Record it; do not act on it here.
- Do not edit the appendices or the solution files, even though C8's overwrite lives in `labs/appendices/dotnet/lab04.md`. This pass corrects what **the lab** claims; the appendix fix is its own change with its own test.
- Do not rename or relocate the shipped `.github/skills/dotnet-testing/` skill to make §4.2 true. Changing repo configuration to suit a lab is backwards.
- Do not add `allowed-tools` teaching or the skill-runs-a-script material. Real and documented, but it is a different lab's worth of content and carries a security warning that deserves more than a line.
- Do not edit any file other than `labs/lab04.md`, this spec and `tests/lab-structure/lab04-contract.test.ts`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | L61, L63, L64, L68, L95, and the IDE guidance inside L59 | Wrong invocation character (C2). Every `@` form becomes `/`: `/prompt-name`, `/create-dotnet-test`, `/create-node-test`, `/name`. L59's own sentence *"Run the `@create-<track>-test` invocation from Copilot Chat in your IDE"* is wrong in the same way and must become `/create-<track>-test`. |
| D2 | L68 and L102 | The **same** "Skills vs Prompts" callout appears twice and the two disagree — L68 says `@name`, L102 says `/name` (C2, C3). Keep one, in the corrected `/name` form. |
| D3 | L21 (§4.1 opening) | "**You don't invoke them** — they activate on their own" is false (C4). Say that Copilot selects a skill from its `description`, **and** that you can name one explicitly as `/skill-name` in your prompt. Keep the auto-activation teaching; it is half the truth, not the whole of it. |
| D4 | §4.4 steps 1–4 (L88–L99) | Step 1 starts `copilot`; step 4 then types a prompt-file invocation into that CLI session, which C1 says cannot work. Mark the prompt step **IDE-only** and move it out of the CLI session, or cut it — but it must not remain an instruction to type a prompt-file name into the CLI. |
| D5 | §4.5, "Skill frontmatter" | "max 1024 chars" is unsourced (C6). Delete the parenthetical. Keep "Be specific!" — the docs do tie selection to the description. |
| D6 | §4.2 | Presents creating `dotnet-testing` as new when it ships in this repo and the appendix overwrites it (C8). State plainly that the skill already ships and the step replaces it, so a learner knows the §4.4 probe cannot fail. |
| D7 | §4.4 step 3 and the 💡 "What you should see" callout | Model-probe-only verification (C9). Name `/skills list` and `/skills info dotnet-testing` as the deterministic check and keep the probe as behavioural corroboration. |
| D8 | L59 | The note is correct and load-bearing but is buried as a `⚠️` aside in §4.3 while §4.4 contradicts it 35 lines later. After D1/D4 the lab should no longer need the apology; keep the IDE-only fact, drop any wording that implies the CLI almost supports it. |

## 7. Out of scope for `lab-forge`

**None of §2's write or model-calling steps may be executed by any stage.** The run gate
reports each UNVERIFIED — not "could not run":

- **Any write to `.github/skills/dotnet-testing/SKILL.md`** or any other path under `.github/skills/` — the shipped file would be silently truncated, and it is a skill the running agent may itself load;
- **Any write to `.github/prompts/create-dotnet-test.prompt.md`** or any other path under `.github/prompts/`;
- `mkdir -p .github/skills/…`, `New-Item … .github/skills/…`, and both appendix heredocs (`cat > … << 'SKILL'`, `… | Out-File -FilePath …`);
- Interactive `copilot`, and any `copilot -p` / `copilot --prompt` / `copilot --agent` invocation — including the §4.4 probes;
- `/skills` and any subcommand (`list`, `info`, `reload`, `add`, `remove`, enable/disable), the `copilot skill …` terminal subcommand, and `/agent`;
- any prompt-file invocation in any surface;
- every GitHub-side write.

**May** be executed, because they are read-only and local: `npm test`, the vitest
invocations in §3, `copilot --version`, `copilot --help`, `copilot help commands`,
`head -5 .github/skills/coding-standards/SKILL.md` and equivalent reads of files that
already exist, directory listings, HTTP `GET` of the reference URLs, and plain file reads.

> There is no sandbox. `lab-forge` runs in the live working tree (`loop.mjs:889`). A stage
> that "ran the lab to see if it works" would overwrite a tracked skill file with a
> truncated copy and leave a new prompt file behind — and `git status` would then blame
> the lab pass for both.
