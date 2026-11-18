import { Cmd, FileCard, Note, PromptCard, Quiz } from "./content";
import type { Lab } from "./types";

const CRITIC_AGENT = `---
name: "critic"
description: "Adversarial reviewer with opposing incentives: critiques implementations against the acceptance criteria, pushes back, and only approves when the criteria are demonstrably met. Read-only on purpose."
tools: ["read", "search"]
---

# Critic

You are the critic in an implementer/critic pair. Your incentive is the
OPPOSITE of the implementer's: you win by finding what's wrong, not by
agreeing.

## Protocol

1. You receive: the acceptance criteria and a description of what was
   implemented.
2. Read the actual files — never trust the implementer's summary.
3. Return a verdict: APPROVED only when every criterion is demonstrably met,
   otherwise REVISE with a numbered list of concrete defects (file + line).
4. Never suggest more than 3 revisions per round — pick the ones that matter.
5. You cannot edit anything. That is the point.
`;

export const lab13: Lab = {
  id: "lab13",
  number: "13",
  title: "A2A Concepts",
  tagline:
    "Implementer + critic with opposing incentives — sub-agents, peers, and the trust boundary between them.",
  steps: [
    {
      key: "lab13/concepts",
      title: "A2A, ACP, peers, and sub-agents",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>Four terms the lab keeps strictly apart:</p>
          <table>
            <thead>
              <tr>
                <th>Term</th>
                <th>What it means</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>A2A</strong>
                </td>
                <td>
                  Two or more agents — each with its own context window, tool
                  allowlist, and system prompt — collaborating by exchanging
                  messages
                </td>
              </tr>
              <tr>
                <td>
                  <strong>ACP</strong>
                </td>
                <td>
                  The protocol behind <code>copilot --acp</code>: a client
                  (editor, script) drives Copilot CLI as an agent over stdio.
                  Client-to-agent, not peer-to-peer
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Peer</strong>
                </td>
                <td>
                  A separate process with its own configuration — it can refuse,
                  push back, disconnect. A <em>trust boundary</em>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Sub-agent</strong>
                </td>
                <td>
                  Dispatched with the <code>task</code> tool: its own context
                  window, but spawned inside your session — inside your trust
                  boundary
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            The decision rule: reach for the lighter pattern unless you need the
            heavier one. Parallelizable research threads inside one task →
            sub-agents (Lab 07's pattern). Two roles that must hold{" "}
            <em>opposing incentives</em>, or one side needing a stricter tool
            allowlist → that's when the separation earns its cost.
          </p>
          <Quiz
            stepKey="lab13/concepts"
            question="What makes an A2A peer fundamentally different from a sub-agent dispatched with the task tool?"
            options={[
              "Peers are faster because they run in parallel",
              "A peer is a separate trust boundary — its own process, tool allowlist, and config; a sub-agent runs inside yours",
              "Sub-agents cannot read files; peers can",
            ]}
            correct={1}
            explain="A sub-agent inherits your environment — anything it can do, you implicitly authorized. A peer is separately configured and can be read-only, on a different model, even in a different repo."
          />
        </>
      ),
    },
    {
      key: "lab13/critic",
      title: "Implementer + critic, live",
      kind: "live",
      verifyId: "lab13/critic",
      body: (
        <>
          <p>
            Build the two-role shape the lighter way — both roles as dispatches
            inside one session, but with the critic's tool scope enforcing its
            role. Note what's missing from its tools:
          </p>
          <FileCard
            path=".github/agents/critic.agent.md"
            content={CRITIC_AGENT}
          />
          <p>
            Restart so it's discovered, then drive one implement → critique →
            revise round:
          </p>
          <Cmd lines={["copilot"]} restart />
          <PromptCard prompt="Run an implementer/critic cycle using your agent tool. Acceptance criteria: getStudent in src/routes/students.ts must reject non-integer ids with status 400 AND a tests/ case must cover it. Round 1: dispatch contoso-dev to verify the criteria are met and implement whatever is missing. Round 2: dispatch critic with the criteria and what contoso-dev reports. If the critic says REVISE, dispatch contoso-dev once more with the critic's defect list, then dispatch critic for a final verdict. Report each round's outcome." />
          <Note>
            Watch the dispatch chips alternate: <code>contoso-dev</code> (can
            edit) and <code>critic</code> (cannot). The critic reading the{" "}
            <em>actual files</em> rather than trusting the implementer's summary
            is the whole value of opposing incentives.
          </Note>
        </>
      ),
    },
    {
      key: "lab13/failures",
      title: "The three failure modes",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            Multi-agent systems fail in characteristic ways. The lab names
            three, each with its mitigation:
          </p>
          <table>
            <thead>
              <tr>
                <th>Failure</th>
                <th>Looks like</th>
                <th>Mitigation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Looping</strong>
                </td>
                <td>The critic that never says yes — endless REVISE rounds</td>
                <td>
                  Bound the rounds (our critic caps revisions at 3 per round;
                  the driver caps rounds)
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Context drift</strong>
                </td>
                <td>
                  A peer working from stale assumptions about files that changed
                </td>
                <td>
                  Hand over <em>references</em>, not snapshots — make the peer
                  re-read the workspace
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Hand-off ambiguity</strong>
                </td>
                <td>
                  An under-specified contract: "review this" with no criteria
                </td>
                <td>
                  A hand-off schema: criteria, what changed, expected verdict
                  format
                </td>
              </tr>
            </tbody>
          </table>
          <Quiz
            stepKey="lab13/failures"
            question="Your critic agent keeps requesting revisions forever. Which mitigation attacks the root cause?"
            options={[
              "Give the critic edit tools so it can fix things itself",
              "Bound the interaction: cap revision items and rounds, and require a terminal verdict format",
              "Run the critic on a larger model",
            ]}
            correct={1}
            explain="Looping is a protocol problem, not a capability problem. Bounds and a terminal verdict (APPROVED / REVISE with ≤3 items) make the conversation converge. Giving the critic edit tools destroys the opposing incentive that justified the split."
          />
        </>
      ),
    },
  ],
};
