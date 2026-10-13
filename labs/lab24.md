---
title: "The Notification Funnel & Executable Tasks"
lab_number: 24
pace:
  presenter_minutes: 6
  self_paced_minutes: 30
registry: docs/_meta/registry.yaml
---

# 24 — The Notification Funnel & Executable Tasks

Lab 23 gave Contoso's SDLC its stages and gates. A gate that nobody knows about is just a
queue, though: the spec waits for a reviewer who doesn't know it's ready, and the
implementer waits for tasks nobody told them about. This lab gets each stage to the right
person, and makes sure that when the work reaches them it's ready to run.

You'll build three things:

- A **funnel** that tells the next owner it's their turn, through assignment, a
  `CODEOWNERS` review request and a Project status. Code decides who's next. The agent
  only words the message.
- An **executable task format**. Each task in `tasks.md` arrives as a prompt with the
  agent, the model tier, the acceptance check and the escalation path already chosen.
  A validator rejects any task that's missing a piece.
- The **`contoso-sdlc` workflow** that Labs 22 and 23 have been promising, plus an
  approval of record for each gate and a rework loop that writes a new task instead of
  re-running the old one.

> ⏱️ Presenter pace: 6 minutes | Self-paced: 30 minutes

**Part of:** Labs 21–26, the enterprise agentic SDLC harness arc — builds on Lab 23.

> ⚠️ **Spec Kit and gh-aw move fast.** This lab hardcodes no versions. Every command reads
> its pin from [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). If a flag below
> doesn't exist in your build, check the pin before you check your typing.

References:
- [Lab 23 — Custom SDLC Stages, Gates & the Rework Loop](lab23.md), the prerequisite
- [Lab 08](lab08.md), for gh-aw safe outputs
- [Lab 21](lab21.md), for the bundle manifest that lists the allowed agents
- `labs/fixtures/lab24/`, the fixtures used throughout this lab
- [`.github/workflows/sdlc-funnel.md`](../.github/workflows/sdlc-funnel.md), the funnel
- [`.github/workflows/validate-task-prompts.yml`](../.github/workflows/validate-task-prompts.yml),
  the CI validator

## 24.0 Prerequisites and currency

> 💡 Versions and pins live in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). Read `spec_kit_version` and
> `gh_aw_schema_version` from there, and substitute them below.

You need:

- [Lab 08](lab08.md), for how gh-aw safe outputs work.
- [Lab 23](lab23.md) completed.
- The repository's Node dependencies, installed with `npm ci` from the repo root. The
  Lab 24 scripts use the repo's `js-yaml`.

🖥️ **In your terminal (from the repository root).** You'll reuse Lab 23's scratch
project, `contoso-sdlc-demo/`. It's gitignored, and it sits directly under the repo root
so the `../labs/fixtures/...` paths resolve.

```bash
npm ci
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v<spec_kit_version>
gh extension install github/gh-aw --pin v<gh_aw_schema_version>
```

Everything in §24.1 to §24.5 runs offline against the fixtures. Only §24.6 and §24.7 need
a GitHub remote and a coding agent.

## 24.1 Who's up next, and where they work

The funnel starts from a role table: for each stage, who's notified next, which Project
status the work moves to, and which tool that person actually works in. It's
[`labs/fixtures/lab24/roles.json`](../labs/fixtures/lab24/roles.json):

| Stage that just finished | Next step | Notified | Their surface | Project status |
|---|---|---|---|---|
| `epic` | `review-epic` | `avery-pm` (PM) | GitHub Copilot app | Epic review |
| `feature-spec` | `review-spec` | `blake-lead` (tech lead) | GitHub Copilot app | Spec review |
| `plan` | `review-plan` | `blake-lead` | IDE | Plan review |
| `story-tasks` | `review-tasks` | `blake-lead` | Pull request | Tasks review |
| `implement` | `qa-review` | `casey-qa` (QA) | Copilot CLI | QA review |
| `qa-review` | `review-qa` | `casey-qa` | Pull request | QA verdict |
| `rework` (implementation) | `implement` | `dana-dev` (developer) | Copilot CLI | Rework |
| `rework` (spec-scope) | `review-spec` | `blake-lead` | Pull request | Spec re-review |

The **surface** column matters. A PM or business user writes the epic and the spec in the
**GitHub Copilot app**, in conversation, with no local dev environment. The tech lead
reviews the plan in the **IDE**, beside the code. The developer works the tasks in the
**Copilot CLI**, where a task prompt can be dispatched as is. QA and the tasks review
happen on the **pull request**, where `CODEOWNERS` already decides who must review. So
the funnel's message tells each person where to go as well as what's ready.

The table also lists each gate's **owner**: the one person whose approval counts (§24.8).

```json
"gates": {
  "review-epic": "avery-pm",
  "review-spec": "blake-lead",
  "review-plan": "blake-lead",
  "review-tasks": "blake-lead",
  "review-qa": "casey-qa"
}
```

PR reviewers come from [`labs/fixtures/lab24/CODEOWNERS`](../labs/fixtures/lab24/CODEOWNERS),
using GitHub's rule that the **last** matching pattern wins. The role table says who's up;
`CODEOWNERS` says who reviews the file. Neither is the agent's call.

## 24.2 A stage signal that leaves the laptop

The funnel has to trigger on *something*. Spec Kit's run state is the obvious candidate,
and it's the wrong one:

- `.specify/workflows/runs/<run-id>/` is **machine-local**. It's on the laptop that ran
  the workflow and nowhere else.
- `.specify/feature.json` is **excluded by a managed `.specify/.gitignore`** (Lab 23,
  caveat 3), so it never travels with the repo either.

A GitHub workflow can't trigger on a file that's never pushed. So each stage writes a
**stage event**: one JSON line appended to `stage-events/<feature>.jsonl`, a committed file
at the repo root. Pushing it is what notifies the next person. It survives the laptop, it
shows up in review, and its history is `git log`.

The workflow's `signal-*` steps write it with
[`record-stage.mjs`](../labs/fixtures/lab24/contoso-sdlc/scripts/record-stage.mjs). Here
is the QA rejection from the fixture, one line in the file, shown wrapped:

```json
{"correlation_key":"001-enrollment-cap/rework/T016/3f9a2c1e",
 "feature":"001-enrollment-cap","stage":"rework","task":"T016","run_id":"3f9a2c1e",
 "from_stage":"qa-review","transition":"rework","classification":"implementation",
 "actor":"casey-qa","at":"2026-05-07T11:09:40Z",
 "artifact":"specs/001-enrollment-cap/tasks.md","artifact_sha":"109898fd…","pr":42}
```

**The correlation key** is `<feature>/<stage>/<task>/<run>`:

| Part | Value |
|---|---|
| `feature` | The Spec Kit feature directory, such as `001-enrollment-cap` |
| `stage` | `epic`, `feature-spec`, `plan`, `story-tasks`, `implement`, `qa-review` or `rework` |
| `task` | A `tasks.md` ID such as `T016`, or `-` for stage-level work |
| `run` | The eight-character Spec Kit run id |

One key names the feature, the stage, the task and the run. The same key goes in the
task prompt (§24.4), the funnel's comment (§24.3), the approval of record (§24.8) and,
in [Lab 25](lab25.md), the telemetry. You can rebuild a feature's history by joining on it.

`artifact_sha` is the artifact's **git blob SHA** (`git hash-object`), not a commit SHA.
It identifies the exact bytes that reached the next person, whatever commit they were in.
`implement` has no single artifact, so its event carries `null`.

> 💡 **The signal step checks Spec Kit's numbering too.** `signal-spec` runs with
> `--check-feature-json`: it fails the run if the feature directory Spec Kit just created
> isn't the `--input feature` you passed. Otherwise a mismatch would show up much later
> as events for a feature nobody has.

## 24.3 The funnel: code routes, the agent writes

Open [`.github/workflows/sdlc-funnel.md`](../.github/workflows/sdlc-funnel.md). It
triggers on a push that changes `stage-events/**`. It follows the same safe-outputs
pattern as `generate-prd.md` and `weekly-content-audit.md`, with one difference that
matters: **the agent doesn't decide where anything goes.**

**1. A deterministic step computes the route before the agent starts.**

```yaml
pre-agent-steps:
  - name: Compute the route (deterministic)
    run: node labs/fixtures/lab24/scripts/route.mjs --events "$EVENTS" --out route.json
```

Try it on the fixture:

```bash
node labs/fixtures/lab24/scripts/route.mjs --events labs/fixtures/lab24/stage-events
```

```json
{
  "correlation_key": "001-enrollment-cap/rework/T016/3f9a2c1e",
  "transition": "rework",
  "classification": "implementation",
  "next": "implement",
  "notify": "dana-dev",
  "surface": "Copilot CLI",
  "project_status": "Rework",
  "target": { "kind": "pr", "number": 42 },
  "assignees": ["dana-dev"],
  "reviewers": ["blake-lead", "dana-dev"],
  "team_reviewers": []
}
```

The reviewers come from `CODEOWNERS` for `tasks.md`. The event's actor, `casey-qa`, is
left out: whoever finished a stage doesn't review their own hand-off. (GitHub also refuses
a review request to a PR's author. The route doesn't know the author, so keep authors out
of the `CODEOWNERS` lines for stage artifacts.)

**2. The agent copies the route and writes one comment.** The prompt tells it to read
`route.json`, emit the assignment, review request and Project update exactly as written,
and write two or three plain sentences ending in `correlation_key: <key>`.

**3. A guard re-computes the route and rejects anything that differs.** This step runs in
the safe-outputs job before any write:

```yaml
safe-outputs:
  staged: true
  steps:
    - name: Reject agent output that disagrees with the route
      run: node labs/fixtures/lab24/scripts/route.mjs --events "$EVENTS" --check "$GH_AW_AGENT_OUTPUT"
```

The agent can choose the wording and nothing else. The guard expects exactly one
assignment, one Project update and one comment (plus one review request when the route
has reviewers), or a single `noop` when the route has no target. If the agent leaves a
write out, adds one, assigns someone else, targets a different PR, changes the reviewers,
sets another status, @mentions someone who isn't routed or drops the correlation key, the
guard fails the job and nothing is written.

**4. Every write is a capped safe output**, with `allowed:` lists and `max:` limits:

| Safe output | Limit |
|---|---|
| `assign-to-user` | `allowed:` the four role logins, `max: 1` |
| `add-reviewer` | `allowed-reviewers:` and `allowed-team-reviewers:`, `max: 3` |
| `update-project` | one Project, `max: 1` |
| `add-comment` | `max: 1` |

> ⚠️ **`staged: true` is the workshop setting, and it means nothing is written.** gh-aw
> previews every safe output in the run summary and applies none of them. That's the
> right default while you're learning what the funnel would do. Remove it only on a repo
> whose role logins and Project URL are real. `update-project` also needs a token with
> Project access, which the default `GITHUB_TOKEN` doesn't have.

Compile it with the pinned gh-aw, and **name the workflow**:

```bash
gh aw compile sdlc-funnel
```

> ⚠️ **Don't run a bare `gh aw compile`.** It recompiles every workflow in the repo, and
> on Windows it rewrites lock files you didn't mean to touch. Revert any changes to other
> `.lock.yml` files before you commit.

## 24.4 Executable tasks: the task-as-prompt format

US-4.2 asks for each task to arrive as an executable prompt, with the agent and model
already chosen, so the developer's job is reviewing the result and handling escalations.

> ⚠️ **This is DIY. Per-task agent and model metadata isn't native to Spec Kit.** Neither
> the tasks template nor the task format has a field for it. Spec Kit doesn't read what
> you add here, doesn't pass it to `implement`, and won't notice if it's wrong. Contoso
> ships it as an **org preset** that extends the tasks template, and its own validator
> and dispatcher are the only things that read it.

The preset is [`labs/fixtures/lab24/contoso-tasks/`](../labs/fixtures/lab24/contoso-tasks/preset.yml).
It **appends** to core's tasks template instead of replacing it, so the native format
stays exactly as Spec Kit ships it: `[ID] [P?] [Story]`, phases and checkpoints. It also
stacks with Lab 22's `contoso-sdd` preset, which appends the governance `G` tasks.

```bash
cd contoso-sdlc-demo
specify preset add --dev ../labs/fixtures/lab24/contoso-tasks
specify preset list
```

Each `T` task gets one fenced `yaml task-prompt` block directly under its line. Here is
T014 from [the fixture](../labs/fixtures/lab24/specs/001-enrollment-cap/tasks.md):

````markdown
- [x] T014 [US1] Create the capacity rule in `dotnet/ContosoUniversity.Core/Services/EnrollmentCapPolicy.cs`

  ```yaml task-prompt
  objective: Decide whether one more enrollment fits in a course.
  deliverable: EnrollmentCapPolicy.CanEnroll(course, currentEnrollments) returning bool.
  sizing:
    self_sufficient: true
  context:
    - specs/001-enrollment-cap/spec.md#requirements
    - specs/001-enrollment-cap/plan.md
  fresh_session: true
  constraints:
    - Pure function. No database, no HttpContext.
  do_not_modify:
    - dotnet/ContosoUniversity.Core/Models/Course.cs
  owned_files:
    - dotnet/ContosoUniversity.Core/Services/EnrollmentCapPolicy.cs
  agent: task-executor
  tier: standard
  fallback_tier: premium
  acceptance:
    command: dotnet test dotnet/ContosoUniversity.sln --filter EnrollmentCapPolicy
    expect: exit 0
  execution: agent
  escalation:
    ladder: [self-heal, redispatch, stage-owner, scope-change]
    retry_budget: 2
    stop_rule: Stop when the acceptance command fails twice or the spec looks wrong.
  correlation_key: 001-enrollment-cap/implement/T014/3f9a2c1e
  ```
````

Why each field is there:

| Field | Rule |
|---|---|
| `objective`, `deliverable` | One deliverable. The task passes the **sizing test**: one fresh session can finish it from the listed context alone, touching at most three owned files. If it can't, split it. |
| `context`, `fresh_session` | Context is passed as files or links, never as "what we discussed". The task runs in a new session. |
| `constraints`, `do_not_modify`, `owned_files` | What the agent mustn't do, what it mustn't touch, and the only files it may change. Every path in backticks on the task line has to be an owned file. |
| `agent` | Must exist in the [Lab 21 bundle manifest](../enterprise-harness-bundle/manifest.yaml). |
| `tier`, `fallback_tier` | A **registry tier** (`cheap`, `standard`, `premium` under `models:` in the registry), **never a model name**. When the registry moves, the tasks follow. |
| `acceptance` | A **runnable** check: a command and the result it must show. "Looks right" isn't a check. |
| `execution` | `agent`, `split` (an agent does it and a person checks it) or `human`. Anything but `agent` needs an `override` naming who decided and why. |
| `escalation` | A ladder (`self-heal`, `redispatch`, `stage-owner`, `scope-change`), a retry budget of 0 to 3, and a stop rule. |
| `correlation_key` | The key from §24.2. Write `{run}` and the workflow stamps the run id. |

> 💡 **Why not steer the agent mid-session?** If you have to steer a task, it was scoped
> badly. The fix is a better task, with tighter context, fewer files and a sharper check,
> not a longer conversation. That's why the ladder escalates to a person rather than
> asking the agent to try harder.

## 24.5 Validate, and reject without re-prompting

[`validate-tasks.mjs`](../labs/fixtures/lab24/contoso-sdlc/scripts/validate-tasks.mjs) is
deterministic. It checks that every field is present, the agent is in the manifest, the
tiers are real, every `context` link resolves, owned files don't overlap `do_not_modify`,
and the run id has been stamped. When something's wrong, it **rejects** the file. It
doesn't try to fix it, and it doesn't ask a model.

```bash
node labs/fixtures/lab24/contoso-sdlc/scripts/validate-tasks.mjs \
  labs/fixtures/lab24/specs/001-enrollment-cap/tasks.md
```

```text
labs/fixtures/lab24/specs/001-enrollment-cap/tasks.md: 4 task prompts valid
```

Now the file that breaks one rule per task:

```bash
node labs/fixtures/lab24/contoso-sdlc/scripts/validate-tasks.mjs \
  labs/fixtures/lab24/invalid/specs/002-invalid/tasks.md
```

```text
… T001: tier claude-… is not a registry tier (cheap, standard, premium)
… T002: agent yolo-agent is not in the manifest (spec-author, task-executor, qa-reviewer)
… T003: context link does not resolve: specs/002-invalid/missing-plan.md
… T003: acceptance needs a command and an expect
… T004: sizing: more than 3 owned files, split the task
… T004: execution split needs override.by and override.reason
… T004: escalation.ladder steps must be from self-heal, redispatch, stage-owner, scope-change
… T004: escalation.retry_budget must be an integer 0-3
… T004: correlation_key run is not stamped (run with --stamp-run)
… T005: no yaml task-prompt block
```

It exits 1. `G001` isn't in the list: people check the governance tasks, not the validator.

**It runs in two places.** Inside the `contoso-sdlc` workflow, the `validate-tasks` step
runs right after `speckit.tasks`, so a malformed task fails the run before anything is
projected or implemented. And in CI,
[`validate-task-prompts.yml`](../.github/workflows/validate-task-prompts.yml) runs on any
pull request that changes a `specs/<feature>/tasks.md`, so a hand edit gets the same check
**before** `taskstoissues` turns it into issues.

**Dispatch.** The same script turns a task into the exact prompt and model to run:

```bash
V=labs/fixtures/lab24/contoso-sdlc/scripts/validate-tasks.mjs
T=labs/fixtures/lab24/specs/001-enrollment-cap/tasks.md
node $V $T --print T016       # the prompt, in plain sentences
node $V $T --dispatch T016    # {"agent":"task-executor","tier":"standard","model":"…","fallback_model":"…","execution":"agent"}
```

`model` is the first model in the registry's tier and `fallback_model` is the first in the
fallback tier, so the task names a tier and the registry picks the model. To run it as a
fresh process with the Lab 21 bundle's agent installed:

```bash
copilot -p "$(node $V $T --print T016)" --agent task-executor --model <model>
```

> 💡 **`--dispatch` reports `execution`, and refuses `human`.** An `agent` task is done
> when its acceptance check passes. A `split` task is dispatched the same way, then
> checked by the person named in `override.by`. A `human` task isn't dispatched at all.

## 24.6 Project the tasks into issues

Spec Kit already ships the projection: **`speckit.taskstoissues`** creates one GitHub
issue per task. It has prerequisites, and it fails without them:

- **An `origin` remote that's a GitHub URL.** The command reads the remote to find the
  repository, and it stops if the remote isn't on GitHub.
- **The GitHub MCP server.** The command's tool list is the MCP server's `list_issues`
  and `issue_write`. Without the server, the agent can't do either.

> ⚠️ **It deduplicates by task ID in the title, against open _and_ closed issues.** Issues
> are titled `T014: <description>`. Before creating one, the command looks for `T014` in
> the title of every issue, closed ones included, and skips it if it finds one. So you
> **can't re-run a task by reopening its ID.** Once `T014` has an issue, `T014` is never
> projected again. That's why rework gets a new ID (§24.9).

The `contoso-tasks` preset **appends** to `speckit.taskstoissues` too. Each issue body
gets the task line, a link to `tasks.md` at the current commit, the task-prompt block and
the correlation key. A task with `supersedes:` links the old issue and closes it.

> 💡 **The append fragment has no frontmatter, on purpose.** When Spec Kit composes a
> command from layers, a non-replace layer's frontmatter replaces the base layer's, and
> only a few keys carry over. A fragment with its own frontmatter would drop core's
> `tools:` list, and the command would lose its access to the GitHub MCP server.

## 24.7 The `contoso-sdlc` workflow

This is the workflow that Labs 22 and 23 said Lab 24 would ship. It's
[`labs/fixtures/lab24/contoso-sdlc/workflow.yml`](../labs/fixtures/lab24/contoso-sdlc/workflow.yml),
with its scripts beside it. Its steps:

```text
epic → signal-epic → review-epic
  → specify → signal-spec → review-spec
  → plan → signal-plan → review-plan
  → tasks → validate-tasks → signal-tasks → [review-tasks]
  → taskstoissues → implement → signal-implement
  → qa-review → signal-qa → review-qa
```

The stage and gate IDs are Lab 23's. Lab 24 adds the signal steps, the validator, the
projection and an **optional `review-tasks` gate** before implementation. That gate is
wrapped in an `if` on the `review_tasks` input, which defaults to `true`, so a team can
turn it off for low-risk features without editing the workflow.

Install it with Lab 23's extension and both presets:

```bash
cd contoso-sdlc-demo
specify extension add --dev ../labs/fixtures/lab23/contoso-review
specify preset add --dev ../labs/fixtures/lab22/contoso-sdd
specify preset add --dev ../labs/fixtures/lab24/contoso-tasks
specify workflow add --dev ../labs/fixtures/lab24/contoso-sdlc
specify workflow info contoso-sdlc
```

> 💡 **Install the directory, not the YAML file.** When the directory holds more than
> `workflow.yml`, Spec Kit installs it as a package, copying the scripts along with the
> workflow. The shell steps find them through `{{ context.workflow_dir }}`. Point `add` at
> `workflow.yml` alone and the scripts aren't installed.

**Collect on Lab 22's promise.** Lab 22's bundle pinned `contoso-sdlc@1.0.0`, and Lab 23
left it as the last unresolved reference. It's installed now, so the online check passes:

```bash
specify bundle validate --path ../labs/fixtures/lab22/contoso-sdd-bundle
```

Run it on a branch that has a pull request, so `--input pr=auto` can find the PR:

```bash
export SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0
specify workflow run contoso-sdlc \
  --input spec="Cap course enrollment at the course capacity" \
  --input feature=001-enrollment-cap --input epic=enrollment-cap --input issue=101
```

`SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0` is [Lab 21](lab21.md)'s safe default. It stops Spec
Kit from adding `--yolo` to every agent it starts.

After each `signal-*` step, commit and push `stage-events/001-enrollment-cap.jsonl`, and
the funnel notifies whoever is next. The run pauses at each gate, as it did in Lab 23.

## 24.8 Approvals of record

> ⚠️ **A Spec Kit gate records a choice, not an approver** (Lab 23, §23.5). The choice
> lives in `state.json` on one laptop, and it's overwritten when the gate runs again. You
> can't count rejections from it, and you can't tell who approved anything.

So each gate's **approval of record** is a durable GitHub artifact, made by the gate's
owner: a PR review, or a comment, with a marker in it.
[`approvals.mjs`](../labs/fixtures/lab24/scripts/approvals.mjs) writes the marker:

```bash
node labs/fixtures/lab24/scripts/approvals.mjs --record --gate review-plan \
  --key 001-enrollment-cap/plan/-/3f9a2c1e --verdict approve --approver blake-lead \
  --artifact specs/001-enrollment-cap/plan.md
```

```text
<!-- contoso-approval {"correlation_key":"001-enrollment-cap/plan/-/3f9a2c1e","gate":"review-plan","run_id":"3f9a2c1e","verdict":"approve","approver":"blake-lead","artifact_sha":"…"} -->
```

Paste it into the review or comment you're leaving. When you resume the gate, answer it
the same way.

**Count from GitHub, not from Spec Kit.** `--count` reads the PR's reviews and the
issue's comments as the GitHub API returns them. A marker counts only if:

- the author **is** the `approver` it names, **and** the gate's owner in the role table;
- the correlation key is `<feature>/<stage>/-/<run>` for that gate;
- `artifact_sha` is a 40-character blob SHA, or `null`;
- on a PR review, the review state agrees with the verdict: `APPROVED` means approve and
  `CHANGES_REQUESTED` means reject.

`source` and `at` come from the platform (`pr-review` or `comment`, and the review's or
comment's timestamp), never from the marker. So nobody can backdate an approval or claim
someone else's.

The fixture is seeded with a rejection. In
[`approvals/pr-comments.json`](../labs/fixtures/lab24/approvals/pr-comments.json), QA
rejects T014 and two markers are forged:

```bash
node labs/fixtures/lab24/scripts/approvals.mjs \
  --count labs/fixtures/lab24/approvals/pr-comments.json
```

```text
records:  5   (epic, spec, plan, tasks approved; QA rejected)
invalid:  2   dana-dev posted a review-qa approval naming casey-qa
              casey-qa's APPROVED review carried a reject marker
counts:   {"approve": 4, "reject": 1, "escalated": 0}
rework_rounds: 1 of 2
```

The full output is in
[`approvals-of-record.json`](../labs/fixtures/lab24/approvals/approvals-of-record.json).
Each record has the shape [Lab 25](lab25.md) joins on: `correlation_key`, `gate`,
`run_id`, `verdict`, `approver`, `artifact_sha`, `source`, `at` and, when a rejection
changes scope, `escalated_to`.

## 24.9 Rework: a new task, not a re-run

QA rejected T014: at capacity, the course still accepted one more student. Here's what
happens next, and who's notified at each step.

**1. QA classifies the rejection** in `qa-review.md`. The Lab 23 `qa-review` command now
asks for one of two classifications:

| Classification | Meaning | Who's notified | Resumes at |
|---|---|---|---|
| `implementation` | The code is wrong, the spec and plan are right | The implementer (`dana-dev`) | QA |
| `spec-scope` | The spec, plan or scope has to change | The `review-spec`/`review-plan` owner (`blake-lead`) | QA, after the spec is re-reviewed |

A `spec-scope` rejection is escalated because Spec Kit can't send an edited spec back
through `review-spec` or `review-plan`. A gate can't rewind, and a new run restarts at
`epic` (Lab 23, §23.6). So the owner re-reviews the change on the PR **before** QA
resumes. QA's reject marker records `escalated_to: "@blake-lead"`, and the funnel says so.

**2. Record the rework event**, which notifies the person named in the table above:

```bash
node .specify/workflows/contoso-sdlc/scripts/record-stage.mjs --feature 001-enrollment-cap \
  --stage rework --from qa-review --transition rework --classification implementation \
  --task T016 --run 3f9a2c1e --require-artifact \
  --artifact specs/001-enrollment-cap/tasks.md --pr auto
```

**3. Write a new task. Don't reopen the old one.** T016 rewrites T014 under a new ID and
says so with `supersedes: T014`. Reusing T014 wouldn't work: `taskstoissues` would skip it
(§24.6), and the history would show one task that passed and then failed. The new prompt
carries what QA found, with `qa-review.md` in its context, and a tighter constraint:
*"Change the comparison only. Do not touch the tests to make them pass."*

**4. Validate, project and dispatch** T016 as in §24.5 and §24.6. The new issue links
T014's and closes it.

**5. Re-run QA fresh, then resume.** `resume` asks the paused gate again; it doesn't re-run
the `qa-review` step before it. So start QA yourself, as a new process, then record the
new verdict as a stage event:

```bash
copilot -p "Review 001-enrollment-cap" --agent speckit.contoso-review.qa-review
node .specify/workflows/contoso-sdlc/scripts/record-stage.mjs --feature 001-enrollment-cap \
  --stage qa-review --from rework --run 3f9a2c1e --require-artifact \
  --artifact specs/001-enrollment-cap/qa-review.md --pr auto
specify workflow resume 3f9a2c1e
```

The run has been paused on `review-qa` since the rejection. Post the new approval of
record (§24.8), then answer the gate.

> ⚠️ **Rounds are capped at two** (`max_rework_rounds` in `roles.json`). `--count`
> reports `round_cap_reached` once QA has rejected twice. T016's stop rule says the same
> thing: *"Round 2 of 2. If QA rejects again, escalate to the review-spec owner."* After
> two rounds, the problem is the spec or the task, not the code.

> ⚠️ **Re-running `speckit.tasks` regenerates `tasks.md`** (Lab 23, §23.6). Add the rework
> task to the existing file by hand and validate it. Don't regenerate the file, or you'll
> lose the T014 to T016 history.

## 24.10 Keep QA independent

The implementer shouldn't grade their own work, and neither should anything that has read
the implementer's account of it.

**Workflow steps are already independent.** Spec Kit runs each command step as a **new
`copilot -p … --agent <command>` process**. The `qa-review` step starts with no memory of
the `implement` step, so it can't be influenced by it.

> ⚠️ **Invoking QA in the same chat throws that away.** Run `qa-review` in the
> conversation that did the implementation and it's read the implementer's reasoning, its
> summary and its excuses. Outside the workflow, start a fresh process yourself:
> `copilot -p "…" --agent qa-reviewer`.

**QA's inputs are the spec, the diff and `tasks.md`.** The Lab 23 command now says so, and
explicitly excludes the implementer's summary, the chat transcript and the PR description.
The fixture's `qa-review.md` records what it read.

**The `qa-review` command now has a `tools:` list**: `read`, `search`, `execute` and
`edit`, which is enough to read the inputs, run the acceptance commands and write
`qa-review.md`. Lab 21's lockdown result sets how far that goes:

> ⚠️ **`tools:` limits what the agent can see. It doesn't grant approval.** Under
> `--yolo`, every visible tool is approved. Run with `SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0`
> and grant the operations QA needs with managed `permissions.allow` rules. Whether `-p
> --yolo` bypasses `disableBypassPermissionsMode` is still open (Q8 in [Lab 21](lab21.md)).

## 24.11 The honest caveats

**1. Per-task agent and model metadata is DIY.** Spec Kit has no field for it, doesn't
read it and doesn't validate it. The preset and validator are Contoso's, and they're only
as good as your CI.

**2. Gates record no approver.** The approval of record is the PR review or comment
(§24.8). If a reviewer answers the local gate and posts no marker, nothing of record exists.

**3. The Copilot app emits no client telemetry.** The `epic` and `feature-spec` stages
happen there, so their history comes only from stage events and approvals of record.
[Lab 25](lab25.md) picks this up.

**4. `taskstoissues` matches by title only.** If someone renames `T014: …`, the command
no longer sees the issue and creates a duplicate.

**5. The funnel routes the latest event only.** If two stage events land in one push, the
earlier one isn't notified. Push each signal on its own.

**6. The validator only resolves local links.** An `https://` link in `context` is
allowed but isn't fetched, so a dead link passes.

**7. `--yolo` versus managed settings is unresolved** (Q8). Until the controlled
enterprise test, run with `SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0`.

**8. The funnel is staged.** `staged: true` previews every write and applies none.
That's correct for the workshop, and it does nothing on a real repo until you remove it.

## 24.12 Verify

Confirm each of these:

```bash
# Routing is computed, and the guard rejects a different route
node labs/fixtures/lab24/scripts/route.mjs --events labs/fixtures/lab24/stage-events

# Valid tasks pass, invalid tasks fail with one line per problem
node labs/fixtures/lab24/contoso-sdlc/scripts/validate-tasks.mjs labs/fixtures/lab24/specs/001-enrollment-cap/tasks.md
node labs/fixtures/lab24/contoso-sdlc/scripts/validate-tasks.mjs labs/fixtures/lab24/invalid/specs/002-invalid/tasks.md

# One QA reject and two invalid markers in the seeded fixture
node labs/fixtures/lab24/scripts/approvals.mjs --count labs/fixtures/lab24/approvals/pr-comments.json

# The funnel compiles clean
gh aw compile sdlc-funnel

# The lab's tests
npx vitest run tests/lab24
```

Then, in `contoso-sdlc-demo/`:

```bash
specify workflow info contoso-sdlc          # 19 steps, review-tasks inside an if
specify bundle validate --path ../labs/fixtures/lab22/contoso-sdd-bundle
```

## What you built

- A **stage signal**, `stage-events/<feature>.jsonl`, that's committed, pushed and
  carries one correlation key per stage, task and run.
- A **funnel** that notifies the next owner on their surface. Code computes the route, a
  guard enforces it and every write is a capped, staged safe output.
- An **executable task format**, shipped as a DIY preset and checked by a deterministic
  validator in the workflow and in CI.
- The **`contoso-sdlc` workflow**, with signals, validation, projection and an optional
  tasks review.
- **Approvals of record** you can count, with a seeded QA rejection and a rework loop that
  writes a new task.

## Key takeaways

- **Trigger on what's pushed.** Spec Kit's state is local and gitignored, so the funnel
  triggers on a committed stage event.
- **Code routes, the agent writes.** If an agent could choose who's notified, it would
  eventually choose wrong. Compute the route, then reject output that disagrees.
- **A task names a tier, never a model.** The registry picks the model, so a model change
  is one registry edit.
- **Reject, don't re-prompt.** A deterministic validator that fails the build is more
  useful than a model that patches a broken task.
- **Rework is a new task ID.** `taskstoissues` never re-projects an ID that's been used,
  and a new ID keeps the history true.
- **Approval comes from GitHub, not the gate.** Count rejections from reviews and
  comments made by the gate owner.
- **QA gets a fresh process and the spec, the diff and the tasks.** Nothing the
  implementer said about its own work.

## Versions and pins

This lab reads every version it depends on from the content registry at
[`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). No version string
is hardcoded in this file. See the registry's re-verification obligations
before running this lab with a cohort.
