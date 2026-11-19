import { FileCard, Note, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

const TASKS_MD = `# Tasks: 001-enrollment-cap

- [ ] T014 [US1] Create the capacity rule in \`src/services/enrollment-cap.ts\`

  \`\`\`yaml task-prompt
  objective: Decide whether one more enrollment fits in a course.
  deliverable: canEnroll(course, currentEnrollments) returning boolean.
  sizing:
    self_sufficient: true
  context:
    - README.md
    - AGENTS.md
  fresh_session: true
  constraints:
    - Pure function. No database, no HTTP state.
  do_not_modify:
    - src/entities/course.ts
  owned_files:
    - src/services/enrollment-cap.ts
  agent: task-executor
  tier: standard
  fallback_tier: premium
  acceptance:
    command: npm test
    expect: exit 0
  execution: agent
  escalation:
    ladder: [self-heal, redispatch, stage-owner, scope-change]
    retry_budget: 2
    stop_rule: Stop when the acceptance command fails twice or the spec looks wrong.
  correlation_key: 001-enrollment-cap/implement/T014/3f9a2c1e
  \`\`\`
`;

export const lab24: Lab = {
  id: "lab24",
  number: "24",
  title: "The Notification Funnel & Executable Tasks",
  tagline:
    "Deterministic stage routing, task-as-prompt validation, authentic approvals of record, and superseded rework tasks.",
  steps: [
    {
      key: "lab24/task-prompt",
      title: "Executable tasks: the task-as-prompt contract",
      kind: "mixed",
      verifyId: "lab24/task-prompt",
      body: (
        <>
          <p>
            To dispatch implementation tasks to agents without mid-session
            hand-holding, Contoso extends <code>tasks.md</code> via the{" "}
            <code>contoso-tasks</code> preset so each <code>T</code> task
            carries a deterministic <code>yaml task-prompt</code> block. Every
            task is validated in CI by <code>validate-tasks.mjs</code> before it
            is projected to GitHub Issues:
          </p>
          <ul>
            <li>
              <strong>Sizing rule:</strong> one fresh session can finish the
              task from its <code>context</code> links alone, touching at most{" "}
              <strong>3</strong> <code>owned_files</code>, with zero overlap
              against <code>do_not_modify</code>.
            </li>
            <li>
              <strong>Registry tiers, never model literals:</strong>{" "}
              <code>tier</code> and <code>fallback_tier</code> name{" "}
              <code>cheap</code>, <code>standard</code>, or{" "}
              <code>premium</code> from <code>docs/_meta/registry.yaml</code>.
            </li>
            <li>
              <strong>Correlation key:</strong>{" "}
              <code>&lt;feature&gt;/&lt;stage&gt;/&lt;task&gt;/&lt;run&gt;</code>{" "}
              (e.g. <code>001-enrollment-cap/implement/T014/3f9a2c1e</code>)
              links the task prompt, stage event, approval of record, and OTel
              spans.
            </li>
          </ul>
          <FileCard
            path="specs/001-enrollment-cap/tasks.md"
            content={TASKS_MD}
            label="specs/001-enrollment-cap/tasks.md"
          />
        </>
      ),
    },
    {
      key: "lab24/funnel",
      title: "Code routes, the agent writes — and approvals of record",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            Because Spec Kit&apos;s <code>.specify/workflows/runs/</code> and{" "}
            <code>.specify/feature.json</code> are machine-local, stages append
            committed JSONL events to{" "}
            <code>stage-events/&lt;feature&gt;.jsonl</code>. Pushing a stage
            event triggers <code>.github/workflows/sdlc-funnel.md</code>:
          </p>
          <Snippet title="the deterministic funnel sandwich">{`1. Pre-agent step (route.mjs) → computes route.json from roles.json + CODEOWNERS
2. Agent job                  → drafts 2-3 prose sentences + copies route.json targets
3. Safe-outputs guard step    → re-runs route.mjs --check; aborts if agent changed any assignee, reviewer, status, or key`}</Snippet>
          <Note>
            <strong>Approvals of record &amp; rework:</strong> Spec Kit gates do
            not record who approved a stage. Durable approvals live in PR
            reviews or comments carrying{" "}
            <code>&lt;!-- contoso-approval {"{...}"} --&gt;</code> where the
            GitHub author matches the gate owner in <code>roles.json</code>.
            When QA rejects <code>T014</code>, it classifies the rejection as{" "}
            <code>implementation</code> (routes to developer via a new task{" "}
            <code>T016</code> with <code>supersedes: T014</code>) or{" "}
            <code>spec-scope</code> (escalates to <code>review-spec</code> /{" "}
            <code>review-plan</code> owner before QA resumes). Always re-run{" "}
            <code>qa-review</code> in a fresh session before{" "}
            <code>specify workflow resume</code>, cap rework at 2 rounds, and on
            an optional live repository run install <code>contoso-sdlc</code>{" "}
            (with its extension and presets) at the repository root using
            root-relative <code>manifest</code> and <code>registry</code>{" "}
            inputs.
          </Note>
          <Quiz
            stepKey="lab24/funnel"
            question="In Lab 24's approvals-of-record check, dana-dev posts a comment with a contoso-approval marker naming casey-qa as approver for review-qa, and casey-qa posts an APPROVED PR review whose marker says verdict: reject. How many valid approvals count?"
            options={[
              "Both count because the HTML comment markers are valid JSON",
              "Zero — an approval marker is valid only when the GitHub author equals the named approver AND owns the gate in roles.json, and on a PR review the GitHub review state (APPROVED vs CHANGES_REQUESTED) must match the marker verdict",
              "Only casey-qa's review counts because casey-qa owns review-qa",
            ]}
            correct={1}
            explain="approvals.mjs rejects forged authors (dana-dev != casey-qa) and state mismatches (APPROVED review carrying a reject marker). Platform metadata (author, review state, timestamp) always wins over claims inside the comment body."
          />
        </>
      ),
    },
  ],
};
