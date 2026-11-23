import { FileCard, Note, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

const OVERLAY_YML = `id: contoso-stages
extends: speckit
priority: 10

edits:
  - insert_before: specify
    step:
      id: epic
      command: speckit.contoso-review.epic
      integration: "{{ inputs.integration }}"
      input:
        args: "{{ inputs.spec }}"

  - insert_before: specify
    step:
      id: review-epic
      type: gate
      message: "Approve the epic before any spec is written."
      options: [approve, reject]
      on_reject: retry

  - insert_after: implement
    step:
      id: qa-review
      command: speckit.contoso-review.qa-review
      integration: "{{ inputs.integration }}"

  - insert_after: implement
    step:
      id: review-qa
      type: gate
      message: "Approve the QA review before closing the run."
      options: [approve, reject]
      on_reject: retry
`;

export const lab23: Lab = {
  id: "lab23",
  number: "23",
  title: "Custom SDLC Stages, Gates & the Rework Loop",
  tagline:
    "Declare epic and QA-review stages in an extension, place them with a workflow overlay, and manage paused gate rework.",
  steps: [
    {
      key: "lab23/overlay",
      title: "Declare in an extension, place with a workflow overlay",
      kind: "mixed",
      verifyId: "lab23/overlay",
      body: (
        <>
          <p>
            Spec Kit&apos;s base workflow runs{" "}
            <code>
              specify → review-spec → plan → review-plan → tasks → implement
            </code>{" "}
            and stops — there is no epic framing before <code>specify</code> and
            no QA review gate after <code>implement</code>. To add them without
            forking core:
          </p>
          <ol>
            <li>
              <strong>Declare the commands in an extension</strong> (
              <code>contoso-review/extension.yml</code>). Every command&apos;s
              middle segment must equal <code>extension.id</code> (
              <code>speckit.contoso-review.epic</code> and{" "}
              <code>speckit.contoso-review.qa-review</code>), enforced at
              install time.
            </li>
            <li>
              <strong>Place the stages and gates with an overlay</strong> that{" "}
              <code>extends: speckit</code>. Overlay anchors must reference steps
              in the <strong>base</strong> workflow, and sibling edits sharing
              an anchor apply in authoring order.
            </li>
          </ol>
          <p>
            Author the workflow overlay at the exact path where{" "}
            <code>specify workflow overlay add</code> stores overlays for{" "}
            <code>speckit</code>:
          </p>
          <FileCard
            path=".specify/workflows/overlays/speckit/contoso-stages.yml"
            content={OVERLAY_YML}
            label=".specify/workflows/overlays/speckit/contoso-stages.yml"
          />
        </>
      ),
    },
    {
      key: "lab23/caveats",
      title: "Gate rework semantics and the five honest caveats",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            When a human answers <code>reject</code> at a gate configured with{" "}
            <code>on_reject: retry</code>, the workflow{" "}
            <strong>does not rewind to an earlier step</strong>. Instead, the
            run pauses on the gate and persists its state under{" "}
            <code>.specify/workflows/runs/&lt;run-id&gt;/</code>:
          </p>
          <Snippet title="rework loop with on_reject: retry">{`1. Gate receives "reject" → run status becomes PAUSED at that gate (never rewinds)
2. Fix the upstream artifact:
   - If spec or plan changed (spec-scope), get review-spec / review-plan sign-off first
     because resuming review-qa skips earlier gates
3. Re-run speckit.contoso-review.qa-review in a fresh session (resume does not re-run it)
4. Run: specify workflow resume <run-id> and answer the gate again`}</Snippet>
          <Note tone="warn">
            <strong>Validation is staged:</strong>{" "}
            <code>workflow overlay add</code> checks YAML shape only;{" "}
            <code>workflow resolve</code> checks base-step anchors;{" "}
            <code>workflow run</code> checks step config such as{" "}
            <code>on_reject</code> (only <code>abort</code>, <code>skip</code>,
            or <code>retry</code> are valid — <code>on_reject: rework</code>{" "}
            passes both <code>add</code> and <code>resolve</code> and fails only
            at <code>run</code>).
          </Note>
          <Quiz
            stepKey="lab23/caveats"
            question="Why do both epic and review-epic in contoso-stages.yml use insert_before: specify instead of anchoring review-epic with insert_after: epic?"
            options={[
              "insert_after is only supported at the end of a workflow",
              "Overlay anchors resolve against the base workflow's step list only — an overlay cannot anchor on a step it inserted itself, and sibling edits on the same base anchor apply in authoring order",
              "Gates cannot use insert_after in Spec Kit",
            ]}
            correct={1}
            explain="epic is not in the base speckit workflow, so insert_after: epic fails at workflow resolve. Anchoring both on insert_before: specify inserts epic first and review-epic second, right before specify."
          />
        </>
      ),
    },
  ],
};
