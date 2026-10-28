import { Note, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

export const lab20: Lab = {
  id: "lab20",
  number: "20",
  title: "Enterprise Token Optimization",
  tagline:
    "From one developer's token discipline to org-scale governance: the right usage source, prompt libraries, and knowledge-base ownership.",
  steps: [
    {
      key: "lab20/sources",
      title: "Why individual advice doesn't scale — and the right source",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            Individual token discipline — <code>auto</code> by default, batch
            tool calls, clear between phases, downshift for tool-heavy loops —
            is per-session and developer-initiated. Three things break at
            enterprise scale:
          </p>
          <ol>
            <li>
              <strong>
                The default-on model policy (Lab 17) removed the implicit cost
                ceiling
              </strong>{" "}
              — new GA models appear in everyone's picker unless an admin
              disabled the policy.
            </li>
            <li>
              <strong>No developer has aggregate visibility</strong> — only an
              admin can see 40 developers all defaulting to premium for routine
              work.
            </li>
            <li>
              <strong>Drift compounds across teams</strong>, not just time: five
              teams, five slightly different lessons conventions.
            </li>
          </ol>
          <p>
            Three sources get confused, and only one holds the aggregate
            numbers:
          </p>
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>What it actually holds</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Standard audit log</td>
                <td>
                  Policy-change + agent-activity events. <strong>No</strong>{" "}
                  token or cost figures
                </td>
              </tr>
              <tr>
                <td>Usage/billing dashboard</td>
                <td>
                  <strong>The primary source</strong>: aggregate seat usage,
                  premium-request consumption
                </td>
              </tr>
              <tr>
                <td>A custom reporting harness</td>
                <td>
                  Downstream only — it repackages the usage export (e.g. as a
                  Lab-19-style weekly digest); never a second place numbers come
                  from
                </td>
              </tr>
            </tbody>
          </table>
          <Quiz
            stepKey="lab20/sources"
            question="Finance wants a monthly view of Copilot seats in use and premium requests consumed, without reading any conversation content. Primary source?"
            options={[
              "The standard audit log — it records everything agents do",
              "The usage/billing dashboard; the audit log has no cost figures, and a custom harness only repackages the export",
              "A custom gh-aw harness that asks each developer to self-report",
            ]}
            correct={1}
            explain="The audit log can't answer a consumption question (policy events only), and a harness sits downstream of the usage export. And nothing establishes per-team splits or per-session averages — check what the billing docs actually offer before promising those."
          />
        </>
      ),
    },
    {
      key: "lab20/governance",
      title: "Prompt & knowledge-base governance",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            At org scale, a prompt file is a governance surface, and the
            recurring answer is the same shared-repo pattern Lab 16 used:
          </p>
          <Snippet title="the governance through-line">{`anything shared org-wide needs an OWNER, a REVIEW, and a VERSION HISTORY

prompts    → central library in the org's .github-private repo,
             CODEOWNERS review, deprecation markers (never silent deletion)
knowledge  → promote reusable lessons into a curated, versioned repo other
             teams' agents are configured to read — the same review discipline
health     → measure it like Lab 19 measures agent drift: stale refs,
             underused entries, duplicates across teams`}</Snippet>
          <Note tone="warn">
            <strong>The anti-pattern the lab names:</strong> a cross-repo
            "memory service" every team's agents read and write. Nobody owns it,
            nothing reviews what enters it, nobody can say which version of a
            lesson an agent acted on. The shared repo gives you all three —
            CODEOWNERS supplies owner and review, git history supplies versions.
          </Note>
          <Quiz
            stepKey="lab20/governance"
            question="Team A's agents keep re-learning a lesson Team B wrote down months ago. What's the governed fix?"
            options={[
              "Stand up a global memory service all agents read and write",
              "Promote the lesson into a curated, versioned .github-private knowledge repo — with CODEOWNERS review — that other teams' agents are configured to read",
              "Paste Team B's lessons folder into every repo",
            ]}
            correct={1}
            explain="Owner, review, versions — the shared reviewed repo provides all three; a memory service provides none, and copy-paste forks the knowledge instantly. That completes the series: the same file-based discipline from Lab 02, scaled to the org."
          />
          <Note>
            <strong>Series complete.</strong> Twenty labs: configuration →
            agents → skills → hooks → orchestration → the GitHub platform →
            memory → the enterprise. Reset the workspace and run it again any
            time.
          </Note>
        </>
      ),
    },
  ],
};
