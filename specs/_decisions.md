# Decision log — Curriculum v2

Append-only. Newest last. One entry per decision that constrains later work.
Never edit a past entry; supersede it with a new one that names what it replaces.

**ID format:** `D-YYYY-MM-DD-NN`, allocated in order on the day it is taken.

---

## D-2026-10-08-01 — Workflow-owned subagents bypass the sub-agent model gate

**Decision:** Loops may assign a model per stage freely. No stage needs to omit `model`,
and no loop-running session needs `COPILOT_ALLOW_SUBAGENT_MODEL=1`.

**Why this was in question.** `~/.copilot/hooks/scripts/pre-tool.sh` denies a `task`
dispatch that names any model other than `claude-opus-5` unless
`COPILOT_ALLOW_SUBAGENT_MODEL=1` is in the CLI's launch environment. The model strategy
deliberately assigns `auto` to several loop stages, so if a dynamic workflow's subagent
dispatch hit that same gate, every one of those stages would have failed. Plan §0.6
required this be determined empirically, not assumed.

**How it was determined.** Two independent lines of evidence, 2026-10-08, CLI 1.0.95-0.

*1 — Static.* The hook's guard is a `case "$TOOL"` whose model-gate arm matches the literal
tool name `task`. Unit-tested through Git bash against crafted payloads:

| Payload | Decision |
|---|---|
| `toolName:"task"` + `model:"claude-haiku-4.5"` | **deny** |
| `toolName:"task"` + `model:"claude-opus-5"` | allow |
| `toolName:"task"`, no `model` key | allow |
| `toolName:"run_dynamic_workflow"` + `model:"claude-haiku-4.5"` | allow |
| `toolName:"agent"` + `model:"claude-haiku-4.5"` | allow |
| no `toolName` + `model:"claude-haiku-4.5"` | allow |

*2 — Live.* A throwaway workflow `probe-model-gate`
(run `08274bae-5064-4807-9354-7f680d083167`, 4 subagents, 76 AI credits) dispatched four
subagents via `ctx.agent()` and required each to return a sentinel under a schema:

| Variant | `model` | Dispatched | Sentinel returned |
|---|---|---|---|
| control | *(omitted)* | yes | yes |
| pinned | `claude-opus-5` | yes | yes |
| non-pinned | `claude-haiku-4.5` | yes | yes |
| non-pinned | `gpt-5-mini` | yes | yes |

*3 — Mechanism.* `pre-tool.sh` was temporarily instrumented to append every tool name it
received to a trace file, gated on a flag file (the hook inherits the CLI's launch
environment, which cannot be altered mid-session, so an env-var toggle was not available).
Across the probe window the hook was invoked **7** times: 6 × `powershell` (this session's
own commands) and 1 × `run_dynamic_workflow` (the workflow launch). It was invoked
**zero** times for the four subagent dispatches.

So the gate does not fire because **`preToolUse` is never raised for a workflow-owned
subagent at all** — the dispatch does not traverse the tool-call path the hook observes.
This is structural, not a model-specific allowance.

The instrumentation was reverted and the file verified byte-identical to its original
(SHA-256 `313B9CFC4A8007030A4EFBBAB07EF240AC525E605AEC004BFA0745A077EA4D1B`); the hook's
own regression suite passed 108/108 while instrumented.

**Consequence.** Plan §0.6 outcome 2. Per-stage model assignment in `spec-forge` and
`lab-forge` is unconstrained. The `task`-tool gate remains fully active for ordinary
sub-agent dispatches and is unchanged.

**Open item for John — this is a gap in a control you rely on.** The `task` gate exists to
stop a session silently downgrading a sub-agent. A dispatch routed through a dynamic
workflow is not subject to it. That is fine for these loops, where the model choice is
deliberate and written down, but it means the gate is a guard on *one* dispatch path rather
than on sub-agent model selection as such. Worth a note in `~/.copilot/hooks/README.md`.
Not actioned here: editing that file was not in this session's scope.

---

## D-2026-10-08-02 — `feature/curriculum-v2` is cut from `origin/main`, not local `main`

**Decision:** The feature branch bases on `origin/main` (`beb1157`), per plan §0.1 and the
session brief.

**The wrinkle, surfaced rather than decided.** At branch time, local `main` was one commit
*ahead* of `origin/main`: `e0f9f6e docs: list only the development agents that exist`
(johnhain-msft, 2026-10-08 15:51 -0400), which corrects `AGENTS.md` from nine named agents
to the three that exist in `.github/agents/` and adds the missing `agentic-workflows`.

That commit is unpushed, in scope subject-wise (docs accuracy is exactly what this effort is
about), and authored by John — so it is not obviously covered by the "source of truth is
`origin/main` only" rule, whose purpose is excluding the `feature/epic-enterprise-harness`
arc (D2 in the plan), not excluding John's own unpushed work.

Followed the explicit instruction rather than reinterpreting it. **Flagged for John's call:**
rebase `feature/curriculum-v2` onto `e0f9f6e`, or leave it and let that commit arrive when
`main` is pushed. Either is a one-command fix now and gets more expensive later.

---

## D-2026-10-08-03 — `dev-qa-judge` is reused unchanged for the SPA track

**Decision:** No fourth loop. The SPA build track runs the existing `dev-qa-judge` workflow
as-is; the `slide-review` and `deck-standards` gates are supplied as **judge inputs**, not
rebuilt as a parallel loop.

**Rationale.** `dev-qa-judge` already enforces the property the SPA track needs — the QA and
judge stages never see the developer's summary or test claims, so a pass is only reported
when the workflow read it from the reviewer itself. Duplicating that to bolt on two deck
gates would copy the hard part to change the easy part.

---

## D-2026-10-08-04 — Loop independence is enforced in code, not in prompts

**Decision:** Every independence guarantee in `spec-forge` and `lab-forge` is a function
with a test, not a sentence in a prompt.

| Guarantee | Enforced by | Defended by |
|---|---|---|
| The verifier never sees researcher prose, confidence or conclusions | `claimsForVerifier()` reduces each bundle to `{claim, sourceUrl, published}` | self-check + mutation "the verifier is shown the researcher's prose" |
| Only `VERIFIED` claims reach a spec body | `partitionGraded()`; an unreadable grade falls to `UNVERIFIED`, never up to `VERIFIED` | 3 mutations |
| Reviewers never see the author's/editor's summary | the summary is never placed in a review brief | mutation "the author's summary is leaked into the reviewer's brief" |
| Each gate leg sees only its *own* prior findings | `priorOwnFindings(state, from)` filters by origin | mutation "a gate leg is shown its sibling's findings" |
| An unreadable verdict is never a pass | `interpretVerdictStage()` refuses any token outside the stage's own vocabulary | 4 mutations |

**Rationale.** A prompt instruction is a probabilistic control. Measured on this machine,
description-triggered skills fire roughly 30% of the time — the instruction layer executes,
but it is not something to hang a load-bearing gate on alone. These five properties are the
entire reason the loops exist, so they are structural.

**Evidence.** `spec-forge`: 42 self-checks, 12/12 mutations killed. `lab-forge`: 47
self-checks, 16/16 mutations killed. Run `node self-check.mjs` and `node mutation-check.mjs`
in either extension directory.

---

## D-2026-10-08-05 — `lab-forge` runs its two gate stages in parallel

**Decision:** Plan §4.3 lists "run it" (`Wayne`) and "teachability" (`Hoid`) as sequential
stages 4 and 5. They run **in parallel** instead, as two legs of one gate.

**Rationale.** The two legs examine different properties of the same lab and neither
consumes the other's result: `Wayne` executes commands, `Hoid` reads for pacing and
prerequisite order. Run sequentially, a lab that fails both costs two full round-trips
through the editor to discover that. Run in parallel, one round returns both sets of
findings.

**Fail-closed semantics, which the sequencing change makes load-bearing.** The gate passes
only when **both** legs pass. A single leg that returns nothing usable makes the whole gate
`unusable` and escalates — an ungraded leg is not a passed one. Both are tested, and both
are covered by mutations.

**Cost.** None in credits; the same two subagents run either way.

---

## D-2026-10-08-06 — `Khriss` and `Hoid` need a CLI restart; the Phase 1 dry runs are substituted

**Decision:** The Phase 1 dry runs exercise the real loop code with `Khriss` remapped to
`judge` (and `Hoid` where applicable) at the dispatch boundary. They are explicitly **not**
full-fidelity runs, and the harness records every substitution it made in its result.

**Why.** Measured, 2026-10-08, via throwaway workflow `probe-agent-resolve`
(run `cac87061-6f0c-4ade-9913-38231fd9fcac`): a session dispatches workflow subagents
against the agents that existed **when it started**.

| Agent | Resolved | Returned its own identity |
|---|---|---|
| `Vasher` | yes | `Vasher` |
| `judge` | yes | `judge` |
| `Wayne` | yes | `Wayne` |
| `Khriss` | **no** | — |
| `Hoid` | **no** | — |

Only 3 subagents were billed for 5 dispatches, confirming the two new agents failed at
dispatch rather than at response. `model-defaults -Sync` added inherit entries for both and
also reports that a restart is required.

**Consequence — carry this forward.** The dry runs prove the *orchestration*: stage
sequencing, `ctx.step` journaling, `ctx.parallel` fan-out, schema parsing against real model
output, per-stage model application, and label uniqueness. They do **not** prove that
`Khriss` and `Hoid` behave as written. **Re-run one dry run of each loop after restarting
the CLI, with no substitutions, before pointing either loop at real curriculum content.**

---

## D-2026-10-08-07 — The first `spec-forge` dry run escalated; the cause was an API error, not the loop

**What happened.** Run `c2576a29-792a-47a7-988d-f9be04af7d0d` (substituted, `Khriss`→`judge`,
`maxRounds` 1) reached the review stage and **escalated**: 14 subagents, 774 AI credits, 13
`completed` and 1 `failed`. The loop did not pass; it failed closed.

**Root cause, read from the session event log (`events.jsonl`).** The review subagent did
not return a bad verdict or malformed JSON. It was killed by an API error:

| Time (UTC) | Event |
|---|---|
| 23:26:31 | turn 15 succeeded on `claude-opus-5` (188,214 input tokens) |
| 23:26:34 | turn 16 → `400 The requested model is not supported` (`model_not_supported`) |
| 23:26:36 | `subagent.failed`: `judge`, `explicitModelOverride=claude-opus-5`, 21 tool calls, 328 s |

It is the **only** `subagent.failed` in the session. The agent's row in the run store reads
`failed`; the other thirteen read `completed`.

**What it was not.** Not a verdict-vocabulary mismatch (the stage never produced a verdict).
Not a model that had been withdrawn: a probe minutes later (run
`6364c5c7-e0be-402c-9da5-5a910a7fab37`) dispatched `claude-opus-5` plainly, with the exact
options that failed (`high`, `long_context`), and `claude-opus-5.5`, and all returned; a
second (run `37b55a99-16e0-4da5-b68a-47e9a9aca375`) showed `max` effort with `long_context`
is accepted. The first inference in this session — "the model vanished from the catalog" —
was wrong, and it was caught only because it was probed rather than assumed.

**Cause: unproven.** The three opus stages peaked at 180.7K (verify), 140.0K (author) and
188.2K (review) input tokens, and the failure was the call after 188.2K, which is circumstantial
evidence for a context-size boundary. The SDK documents `long_context` as a *pin* ("when
supported"), not a mid-run switch, so that theory is unproven and **nothing is built on it**.
The design below holds whatever the cause was.

**Models stay pinned; inherit was rejected.** `model-defaults` reports an org-managed default
of `auto` that "replaces the model above at every new session start". A plain subagent in the
restarted session resolved to `claude-sonnet-5.5`, not the `claude-opus-5` in `settings.json`.
Switching the adversarial stages to inherit would therefore have silently run them on Sonnet.
They remain pinned per plan §6, and every result now carries `modelsUsed` and
`modelMismatches` (an explicit pin that resolved to a different model) so a downgrade is
visible. Note the `task` tool's model enum in this session lists no `claude-opus-*` at all
while workflows address it freely: that enum is not a statement of availability.

---

## D-2026-10-08-08 — A failed stage stops the run as a resumable error; nothing is journaled for it

**The defect the dry run exposed.** The step wrapper converted a failed subagent into
`{"stage":"review","outcome":"unusable"}` and journaled it as the step's result. A failed
*agent call* is not journaled by the runtime (27 journal rows: 10 gather agent calls and their
10 steps, scope/verify/author each as an agent call plus a step, and one review step), but the
wrapper's record was. A resume would have replayed that 125-byte record and re-escalated
without dispatching anything, discarding ~700 credits of finished work for one transient error.

**The mechanics, proven rather than assumed** (throwaway workflow, run
`bac647ff-a589-4c1b-8c0b-6d16614151a2`): a step whose producer throws is **not journaled**; the
run ends in status `error`; resuming it completes as attempt 2 and **replays** the journaled
step (identical timestamp `1791502849613`) rather than re-running it.

**Change (both loops).** A `null` from `ctx.agent` now throws instead of being interpreted.
The run ends as a resumable `error`; a resume replays every completed stage and re-dispatches
only what failed. For a parallel fan-out the surviving legs finish and journal first. The
error says *why*, using the run record: `failed` (the subagent errored; the event log has
`subagent.failed`), `completed` but unparseable (a schema miss), or no row at all (an agent
that does not exist resolves this way, as `Khriss` and `Hoid` did before the restart).

**Narrowed, not removed.** A subagent that returns readable output the loop cannot use — an
unreadable verdict, a verifier that grades nothing — is still journaled `unusable` and
escalates. That is a judgment about content, not a transient fault.

**Supersedes** the fail-closed paragraph of D-05 for infrastructure failures: a dead gate leg
now stops the run resumably instead of escalating.

**Flag for John, not actioned.** `dev-qa-judge/run.mjs` has the same wrapper shape — it
journals `interpretDev/interpretReview(null)` as the step result — so a transient failure there
would be replayed on resume too. D-03 reuses that loop unchanged, so it was left alone.

---

## D-2026-10-08-09 — `spec-forge` drops nothing silently

**Evidence from the dry run's own journal.** Two of the ten researchers returned
`"claims":[],"noPublishedGuidance":true`. The loop dropped both, and its result read
`56 VERIFIED, 0 carried as open`. "No published guidance exists" is meant to be a first-class
finding (specs/README.md); structurally it was not. Separately, a log line claimed ungraded
claims "are treated as unverified" when nothing did so, and sub-questions cut by the cap were
logged but never reached the author.

**Changes.**
- **Absence is a claim to refute.** A researcher's "nothing is published" goes to the verifier
  as `No published guidance exists on: <sub-question>`, with the researcher's reasoning
  withheld. The verifier is told to try to refute it: `CONTRADICTED` with a URL if guidance
  exists, `NO-SOURCE` if a genuine search finds none. An absence claim can **never** be
  `VERIFIED` — enforced in code, not asked for in a prompt.
- **Grades are joined by id, not by text.** Claims carry ids; `reconcileGraded()` keeps the
  *original* claim text (a paraphrase cannot change what was graded), ignores a row for an id
  the verifier was never given (it cannot promote a claim it invented), and records a claim it
  skipped as `UNVERIFIED` instead of losing it.
- **Unanswered and unrun sub-questions are carried** to the author as open questions.
- **Verification runs in bounded parallel batches** (≤ 12 claims per call, claims citing the same
  page kept together). One verifier grading 56 claims reached ~180K tokens, because every turn
  re-sends the whole context; that does not scale to a real research question.

**Not changed, deliberately.** The 56 claims had no exact duplicates (56 distinct texts across
5 distinct URLs), so no de-duplication was added.

---

## D-2026-10-08-10 — Alignment with what already existed

- **Review verdicts use `judge`'s own contract.** `PASS | ACCEPT WITH FINDINGS | BLOCK`
  (`judge.agent.md` line 393; the vocabulary `dev-qa-judge` already reads). The `READY /
  NOT READY` pair came from the plan's wording, not from `judge`, and was a token `judge` does
  not natively emit. The loops' own outcome word stays `READY`.
- **`spec-forge` scopes inline.** The scope stage ran as `planner`, which is defined by *this
  repository* (`.github/agents/planner.agent.md`, "for the ContosoUniversity .NET project").
  A generic loop must not depend on a repo-scoped agent, and a .NET planner is the wrong lens
  for decomposing a research question. Plan §4.2 allowed "`planner` or inline".
- **Adversarial stages run at `max` effort.** Plan §6 says `max`; the code said `high` with no
  recorded reason. Spec authoring also takes `long_context`, as the plan's table says.
- **Corrections to earlier entries.** D-04's "enforced by `interpretVerdictStage()`" was true
  of `lab-forge` only; `spec-forge`'s reviewer accepted any normalizable token and now enforces
  its own vocabulary too. D-04's evidence counts are superseded: `spec-forge` 77 self-checks and
  35/35 mutations killed; `lab-forge` 56 self-checks and 23/23 mutations killed.

---

## D-2026-10-08-11 — `Khriss` and `Hoid` are dispatchable, and they discriminate

**Binding (supersedes D-06's blocker).** After the CLI restart, throwaway run
`6364c5c7-e0be-402c-9da5-5a910a7fab37` dispatched both as workflow subagents and both
returned (they inherit, and an inheriting subagent currently resolves to `claude-sonnet-5.5`;
see D-07). The restart D-06 asked for has happened; its other demand — a full-fidelity dry run
of each loop — is recorded in D-12.

**Behaviour: `Khriss`.** Throwaway run `7a740181-40c7-473a-9f7e-1d33cc8346f9` handed `Khriss`
`spec-forge`'s *real* verify prompt, built by `briefFor()`, over six planted claims. The ground
truth was read from the primary page by hand first
(`docs.github.com/en/copilot/reference/custom-agents-configuration`: `description` is the only
Required property, `name` is "Optional", the prompt maximum is 30,000 characters).

| Planted claim | Expected | `Khriss` returned |
|---|---|---|
| `description` is the only Required property (true) | `VERIFIED` | `VERIFIED`, quoting the properties table |
| `name` is Required (false) | `CONTRADICTED` | `CONTRADICTED`: "Display name… Optional" |
| prompt maximum is 50,000 characters (false) | `CONTRADICTED` | `CONTRADICTED`: "maximum of 30,000 characters" |
| true claim, cited to a URL that returns 404 | not `VERIFIED` against the dead URL | `UNVERIFIED`: "HTTP 404… not silently replaced with a different URL" |
| a researcher's "nothing is published" on the per-repository maximum | never `VERIFIED` | `NO-SOURCE`, after a described search of the docs, release notes through 1.0.94, SDK source and issue trackers |
| true claim, cited to the Copilot docs landing page | not `VERIFIED` against the landing page | `VERIFIED`, recorded against the how-to page he actually opened |

All six pre-registered checks passed. A rubber stamp fails four of them.

**Behaviour: `Hoid`.** The same run gave him `lab-forge`'s real teachability prompt over the
*unfixed* throwaway lab, which declares "VS Code Copilot only, beginner" and then tells the
reader to run `copilot --version`. Verdict `NOT TEACHABLE`. His derived profile contradicts the
declared one ("VS Code Explorer and Copilot Chat, **plus a terminal running a separately
installed Copilot CLI**"; "Advanced relative to the declared VS Code-only beginner track"). Four
S1, four S2, one S3, each with a `file:step` location, who it breaks, and the smallest fix. The
planted surface defect was caught precisely ("even an integrated terminal uses a separate CLI").

**Cost.** 72.7 AI credits for both calls.

**What this evidence is not.** One run each, six claims, one lab — a discrimination check, not
a calibration. It shows neither agent is a rubber stamp; it does not give an error rate.

**Two things to know.** (1) The last row shows a policy asymmetry: `Khriss` refused to
substitute a source for a dead URL but followed a live landing page to the correct page. It
records the page he actually opened, so a spec built on it cites the page that states the
claim, which is the outcome wanted. If John would rather any citation that does not itself
state the claim grade `UNVERIFIED`, that is a one-line change to `khriss.agent.md`. (2)
`Hoid` raised, unprompted, that `@planner` is not how VS Code selects a custom agent (it uses
the Agent dropdown). That was not a planted defect, and it is **unverified** here: it was not
opened against the VS Code documentation.

**Correction, added by D-12.** Both agents in that run were pinned to `claude-opus-5` and
actually ran on `gpt-6.1-sol`. The behavioural result stands; the model it was obtained on is
not the one stated above.

---

## D-2026-10-08-12 — A workflow's model pin did not take effect for custom agents

**What was observed.** The run store records `requested_model` and `resolved_model` per
subagent. Every pin in this session was `claude-opus-5`.

| Agent type | Dispatches | Resolved to |
|---|---|---|
| `general-purpose` (probes, incl. one at 00:28Z) | 5 | `claude-opus-5` — pin honoured |
| `judge`, `Vasher` — first dry run, before the restart | 2 | `claude-opus-5` |
| `Khriss` — probe, lab-forge drift, spec-forge verify ×2 | 4 | **`gpt-6.1-sol`** |
| `Hoid` — probe, lab-forge teach | 2 | **`gpt-6.1-sol`** |
| `Vasher` — lab-forge edit, spec-forge author | 2 | **`gpt-6.1-sol`** |
| `judge` — spec-forge review | 1 | **`gpt-6.1-sol`** |

The event log shows it is real and not a bookkeeping artefact. For `verify:r1:b1`,
`subagent.started` reports `model: claude-opus-5`, `modelSelectionSource: explicit_override`;
`subagent.completed` reports `firstDispatchedModel: gpt-6.1-sol` with the same
`explicitModelOverride: claude-opus-5`; and **all nine of its assistant turns ran on
`gpt-6.1-sol`**. The platform's own `model` field is therefore not to be trusted; the per-turn
model and the run store's `resolved_model` are. The SDK documents a `modelOverrideReason`
("why an explicit task-call model did not become the effective model"); it is absent here.

**What is established, and what is not.** Established: in this environment, today, a
`model` option on `ctx.agent` was ignored for custom agents and honoured for `general-purpose`.
Not established: *why*. `settings.json`'s default model is now `gpt-6.1-sol` (rewritten at
00:08:04Z, with a backup at 23:52:52Z that this session did not create; it read
`claude-opus-5` when first read), which coincides with what the custom agents ran on, and the
SDK documents `configured_required` and `complementary_default` selection sources. Testing the
settings theory means changing John's configuration, so it was not tested and `settings.json`
was not touched. The pre-restart `judge`/`Vasher` results are consistent with the same theory
(the default was then `claude-opus-5`) but do not prove it.

**Supersedes** D-07's "Models stay pinned; inherit was rejected" for custom agents, where
neither a pin nor inherit controlled the outcome, and the model attribution in D-11.

**What changed in the loops.** The pins in `STAGE_MODELS` are re-described as *declared
intent*, not a control. Every result carries `modelsUsed` and `modelMismatches`, and a
mismatch adds a `CAVEAT` to the headline so a passing verdict is never presented as having run
on the declared model when it did not. **Not changed:** the loops do not refuse to continue on
a mismatch. In this configuration every custom-agent stage mismatches, so refusing would block
every run. That trade-off is John's to make.

**For John (not taken).** What should the adversarial stages run on, and where is it set?
(a) restore `settings.json`'s default to `claude-opus-5`; (b) give the five loop agents
explicit per-agent entries with `model-defaults`, the mechanism `Tress` already uses; or (c)
accept `gpt-6.1-sol`. A verifier that does not share the author's model family also does not
share its blind spots, which is an argument for (c), but it is an argument, not a measurement.

---

## D-2026-10-08-13 — The `lab-forge` execution gate drove the operator's live VS Code

**What happened.** In the full-fidelity `lab-forge` dry run (`db919fd4-0fd8-4c91-bb4a-cbd98cedee5d`)
the execution gate (`Wayne`, `gate:run:r1`) made **45 `computer-use` calls between 00:29:36Z
and 00:41:49Z** against the `Microsoft.VisualStudioCode` window `1052874`: it opened this
repository's path, searched, typed `copilot_cli_version_floor`, set a Copilot Chat input to the
lab's Step 4 prompt ("Plan a feature that lets a teacher sort a course list by title…") and
then clicked an element that is very likely **Send**. `Vasher` (`edit:r1`) made two read-only
calls (`list_apps`, `get_window_state`) at 00:26Z. An audit of every event in the session found
47 `computer-use` calls in total and no others.

**Cause: mine.** The gate prompt said "work through the lab as a learner would and actually
EXECUTE it"; the throwaway lab declared "VS Code Copilot only"; no prompt forbade GUI
automation. Operating VS Code is what "executing" that lab means. The agent was following its
instructions, and the instructions never said not to touch someone's desktop.

**Containment.** Noticed from the gate's elapsed time and confirmed from its tool trace. The
`lab-forge` host process (PID 33340) was stopped at about 00:42Z; the run ended
`error: connection closed`; `Wayne` shows `cancelled` at 00:41:57Z and made no call after
00:41:49Z. The journal (audit, drift, edit and the teach leg) is intact and the run is
resumable. A cancel workflow was tried first and failed to start (`startup-timeout`) while two
`max`-effort subagents were loading the machine.

**Impact assessed, not fully known.** No tracked file in the repository changed (`git status`
shows only this log's own pending edit). The screen was **not** inspected, so these are
unknown and John should check VS Code: whether the chat shows a sent prompt, whether the
window's workspace changed, and whether the typed text landed in an editor buffer rather than
a search box. `.github/logs/prompts.log` gained entries at 00:38:59Z and 00:41:21Z
(timestamps only, no prompt text).

**Fix, and its limit.** Every stage prompt in both loops now forbids driving a desktop
application, and the execution gate is told that a GUI-only step is *not attempted*: it is
reported as an S3 "not executed: requires operating <application>", stays visibly unverified,
and is not a pass for that step. That is a prompt-level control, and this project has measured
prompt-level controls as probabilistic (description-triggered skills fire roughly 30% of the
time). It reduces the risk; it does not remove it. Structural options exist but are John's:
a `preToolUse` hook that denies `computer-use-*` from subagent sessions, or `tools:` allowlists
in the agent definitions. The allowlist is untested here: a changed agent definition needs a
restart to load, and whether the `web` alias covers the fetch tools is unverified, so applying
it blind could leave `Khriss` unable to open sources.

**Open design question for Phase 2.** Verifying that a lab is "drivable entirely in VS Code
Copilot" is exactly the thing that needs a VS Code to be driven, or a person. Should
`lab-forge` offer opt-in desktop automation with explicit per-run consent (an argument whose
value is visible in the run record), or leave that check to a manual rehearsal? That belongs
in specs 003 and 005, not in this loop's defaults, which are now "never".

---
