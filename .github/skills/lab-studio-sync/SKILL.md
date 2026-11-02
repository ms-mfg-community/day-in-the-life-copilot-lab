---
name: lab-studio-sync
description: How to keep Lab Studio (lab-studio/) in sync with the lab markdown in labs/*.md — the file mapping, the sandbox adaptation rules, the step/verify conventions, and the sync procedure. Use when lab content changed, when "npm run drift" reports drift, or when adding a new lab to the studio.
---

# Lab Studio ↔ labs/*.md Sync

Lab Studio's content is an **adaptation** of the lab markdown, not a build
artifact of it. Each `labs/labNN.md` has a hand-authored counterpart at
`lab-studio/client/src/labs/labNN.tsx`, restructured for the studio's
sandbox and interaction model. Syncing is judgment work; this skill is the
rulebook for doing it consistently.

## The coupled surfaces (change one, check all four)

| Surface            | Path                                                                       | Holds                                        |
| ------------------ | -------------------------------------------------------------------------- | -------------------------------------------- |
| Studio lab content | `lab-studio/client/src/labs/labNN.tsx`                                     | Steps: prose, tables, action cards           |
| Verify checks      | `lab-studio/server/src/verify.ts`                                          | One check per `verifyId`, keyed `labNN/slug` |
| Sandbox template   | `lab-studio/server/template/`                                              | Files steps reference or create-over         |
| Simulated surfaces | `lab-studio/server/src/sim-terminal.ts`, `sim-github.ts`, `sim-actions.ts` | Commands/platform behavior steps invoke      |

Drift detection: `cd lab-studio && npm run drift` (hash baseline in
`lab-studio/lab-sources.json`; `npm run drift:accept` after syncing).

## Adaptation rules (markdown → studio)

1. **The sandbox is the Node mini-workspace**, not the real repo. Standing
   translations:
   | Lab markdown                                        | Studio equivalent                                         |
   | --------------------------------------------------- | --------------------------------------------------------- |
   | `dotnet/ContosoUniversity.*` projects               | `src/entities`, `src/repos`, `src/routes`, `tests/`       |
   | `dotnet-dev` / `node-dev` agent                     | `contoso-dev`                                             |
   | `dotnet-qa` agent                                   | `contoso-qa`                                              |
   | `dotnet-testing` / `node-testing` skill             | `contoso-testing`                                         |
   | `razor-views.instructions.md`                       | `routes.instructions.md`                                  |
   | xUnit / Moq / `MethodName_Condition_ExpectedResult` | Vitest / in-memory repos / `<unit>.<scenario>.<expected>` |
   | `dotnet build` verification                         | `tsc --noEmit` / `vitest run`                             |
2. **Live vs simulated is a hard boundary.** Anything the SDK can really do
   (sessions, agents, skills, instructions, hooks, subagent dispatch, MCP)
   stays LIVE. Anything needing a remote (marketplace, Actions, PRs,
   rulesets) is SIMULATED and must be visibly badged (`kind: "sim"`, amber
   notes, `sim: true` terminal blocks). Never present simulated output as
   live, and keep the AI inside simulated workflows real (bridge.runWorker).
3. **Keep the teaching inflections.** Restart-required-after-config-edits,
   "narration is not delegation", "a clean review is a real result",
   dry-run-before-live, deny-by-default — these are the labs' load-bearing
   lessons; preserve them when rewording.
4. **Compress, don't dilute.** A lab becomes 2–5 steps. Reference tables and
   key insights survive; platform-specific shell variants (PowerShell/WSL
   duplicates), cleanup checklists, and presenter pacing do not.

## Step conventions

- Step shape: `{ key: "labNN/slug", title, kind, verifyId?, quiz?, body }`.
  `kind`: `live` (real Copilot), `sim`, `read`, `mixed` (no badge).
- Every step completes exactly one way: a `verifyId` with a matching check in
  `verify.ts`, OR `quiz: true` with a `<Quiz stepKey="labNN/slug" …>` in the
  body, OR neither (mark-read button appears automatically).
- Verify checks inspect real state only: workspace files
  (`fileExists`/`parseFrontmatter`), terminal history (`ranCommand`), bridge
  session state (`bridge.promptHistory/toolCalls/skillInvocations/
hookFirings/subagentRuns`, `bridge.getMeta()`), or simulated GitHub state
  (`loadGitHub()`). Fail messages must say what to do next.
- Component vocabulary (from `client/src/labs/content.tsx`):
  `<Cmd lines restart?>` (restart swaps a leading `copilot` for `/new` when a
  session runs), `<PromptCard prompt agent?>`, `<FileCard path content
mode?>`, `<Snippet>`, `<Quiz>`, `<Note tone?>`, `<OpenFileButton>`,
  `<GitHubTabButton>`. File contents live in template literals — escape
  backticks, never use `${`.

## Sync procedure

1. `cd lab-studio && npm run drift` — see which labs/labNN.md changed.
2. `git log -p -- labs/labNN.md` (or diff against the last synced state) —
   classify the change: prose fix / command change / new step / removed
   step / new file artifact / version-pin bump.
3. Apply to `client/src/labs/labNN.tsx` under the adaptation rules. If
   commands, file names, or expected outputs changed, update the matching
   `verify.ts` check, template files, and sim command behavior.
4. Prove it: `npm run typecheck && npm test`. For a changed live step, run
   the studio (`npm run dev`) and exercise that step end to end before
   trusting it.
5. `npm run drift:accept`, then commit the tsx + verify + template +
   `lab-sources.json` changes together.

## Hard constraints

- Never add a `verifyId` without its server check — the Verify button would 400. Never delete a check that a shipped step still references.
- Step `key`s are progress-tracking identity: renaming one resets learners'
  progress for that step. Rename only with cause.
- Don't edit `lab-sources.json` by hand; only `npm run drift:accept` writes it.
- The studio never modifies `labs/*.md` — sync flows one way, markdown → studio.
