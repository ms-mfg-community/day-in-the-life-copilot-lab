import { Cmd, Note, PromptCard, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

export const lab14: Lab = {
  id: "lab14",
  number: "14",
  title: "Orchestrator + tmux Pattern",
  tagline:
    "Long-lived orchestrator, short-lived workers, and the handoff-file cycle that keeps context cheap — drilled live.",
  steps: [
    {
      key: "lab14/pattern",
      title: "Why panes, why the cycle",
      kind: "read",
      body: (
        <>
          <p>
            Lab 07's orchestration ran inside one session; Lab 13 split trust
            boundaries. This lab is the operational pattern that built the
            workshop repo itself: a{" "}
            <strong>long-lived orchestrator pane</strong> that holds the plan,
            and <strong>short-lived worker panes</strong> that implement, hand
            off, and get cleared:
          </p>
          <Snippet title="the prescribed cycle">{`┌─ tmux ───────────────────────────────────────────┐
│ orchestrator pane        │ worker pane            │
│ (long-lived session:     │ (short-lived sessions) │
│  plan, judge, dispatch)  │                        │
└──────────────────────────┴────────────────────────┘

plan → implement → handoff → clear → qa → clear
 (orchestrator)  (worker)  (file)  (worker ctx)  …`}</Snippet>
          <p>
            The repo ships <code>scripts/orchestrator/</code> —{" "}
            <code>tmux-start</code> brings up the layout, <code>handoff</code>{" "}
            writes the hand-off file, <code>clear-context</code> resets a worker
            between phases. Two disciplines make it work:
          </p>
          <ul>
            <li>
              <strong>Workers are disposable.</strong> Context is the scarce
              resource — a worker finishes a phase, writes a handoff, and is
              cleared. Nothing durable may live only in a worker's conversation.
            </li>
            <li>
              <strong>The handoff file is the contract.</strong> State of work,
              stop reason, blockers, and a Fresh Context Prompt a successor can
              run on verbatim.
            </li>
          </ul>
          <Note tone="warn">
            Compatibility matters in the real lab: tmux means macOS, Linux, or
            WSL2 — Windows PowerShell can't run this pattern, which is why the
            preflight's <code>--lab14</code> flag makes a missing tmux a FAIL.
          </Note>
        </>
      ),
    },
    {
      key: "lab14/handoff",
      title: "Drill the handoff cycle, live",
      kind: "live",
      verifyId: "lab14/handoff",
      body: (
        <>
          <p>
            The studio has one terminal, not panes — but the cycle's heart is
            the handoff file, and that drills exactly the same. Act as the
            worker finishing a phase:
          </p>
          <PromptCard prompt='Follow .github/skills/handoff/SKILL.md. Work description: "Lab 14 drill — students limit parameter groundwork". Stop reason: "phase complete; QA not yet run". Blocker: none. Save the handoff as .copilot/handoff.md and print the exact path.' />
          <p>
            Now the <code>clear</code> step: kill the worker's context entirely,
            and resume from nothing but the file:
          </p>
          <Cmd
            lines={["copilot"]}
            restart
            label="a fresh session — the cleared worker"
          />
          <PromptCard prompt="Read .copilot/handoff.md. From its Fresh Context Prompt section, tell me where we stopped and what the Immediate Next Step is. Do not run anything yet." />
          <Note>
            The fresh session names the next step even though its own history
            contains nothing — that's the handoff doing its job. A handoff is a
            Layer 1 artifact (Lab 10's taxonomy): one task, uncurated; anything
            in it that matters next week still needs promoting to the wiki.
          </Note>
        </>
      ),
    },
    {
      key: "lab14/discipline",
      title: "Token discipline & stop-and-ask",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            Why clear workers at all? Because <code>clear</code> and{" "}
            <code>.copilot/lessons/</code> are complements: clearing keeps
            per-phase token cost flat, and the wiki keeps what clearing would
            otherwise lose. An orchestrator that never clears pays for every
            phase's history on every turn; a worker that clears without a
            handoff loses the work.
          </p>
          <p>
            The pattern's stop-and-ask triggers — moments the orchestrator must
            escalate to the human:
          </p>
          <ul>
            <li>A worker wants to touch files outside the phase's scope</li>
            <li>Two phases disagree about an interface and neither owns it</li>
            <li>
              A destructive operation (rebase, force-push, delete) on anything
              shared
            </li>
          </ul>
          <Quiz
            stepKey="lab14/discipline"
            question="A worker just finished Phase 2 of 5. What's the correct order of operations before Phase 3 starts?"
            options={[
              "Clear the worker, then write the handoff from memory",
              "Write the handoff file, then clear the worker, then start Phase 3 from the handoff",
              "Keep the worker's context — clearing loses too much",
            ]}
            correct={1}
            explain="Handoff before clear, always — the file is written while the context still exists. Then the cleared worker (or a new one) resumes from the file at flat token cost."
          />
        </>
      ),
    },
  ],
};
