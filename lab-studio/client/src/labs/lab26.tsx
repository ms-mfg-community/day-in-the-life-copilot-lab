import { FileCard, Note, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

const BOARD_FILTER_MJS = `export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function filterByState(issues, state) {
  const normalized = String(state ?? "").trim().toLowerCase();
  if (normalized !== "open" && normalized !== "closed") {
    throw new Error('state must be "open" or "closed"');
  }
  return (Array.isArray(issues) ? issues : []).filter(
    (issue) => String(issue?.state ?? "").toLowerCase() === normalized,
  );
}
`;

export const lab26: Lab = {
  id: "lab26",
  number: "26",
  title: "Copilot App Canvases for Applied SDLC Operations",
  tagline:
    "Project-scoped canvas extensions, capability-token gates, HTML escaping, and dry-run-first SDLC operations.",
  steps: [
    {
      key: "lab26/canvas",
      title: "Build the SDLC board state filter and HTML escaper",
      kind: "mixed",
      verifyId: "lab26/canvas",
      body: (
        <>
          <p>
            Lab 26 brings the enterprise harness onto an operator surface via
            the project-scoped extension at{" "}
            <code>.github/extensions/enterprise-sdlc-workbench/</code>, which
            registers three canvases:
          </p>
          <table>
            <thead>
              <tr>
                <th>Canvas ID</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>sdlc-board</code>
                </td>
                <td>
                  EPIC-001 issue readiness (open + all dependencies closed),
                  label/state filters, and dry-run dispatch with correlation
                  keys
                </td>
              </tr>
              <tr>
                <td>
                  <code>code-map</code>
                </td>
                <td>
                  Live <code>dotnet/ContosoUniversity.sln</code> project map +
                  bounded prerequisite probes (<code>dotnet</code>,{" "}
                  <code>docker</code>, <code>gh</code>)
                </td>
              </tr>
              <tr>
                <td>
                  <code>release-composer</code>
                </td>
                <td>
                  Drafts release handoff docs from completed issues — separates
                  local <code>save_draft</code> from external{" "}
                  <code>publish</code>
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            Complete the Lab 26 hands-on exercise by authoring the state filter
            and HTML escaper module in the workspace — the Verify step imports
            and executes both functions against open/closed issues and hostile
            HTML strings:
          </p>
          <FileCard
            path=".github/extensions/sdlc-filter/filter.mjs"
            content={BOARD_FILTER_MJS}
            label=".github/extensions/sdlc-filter/filter.mjs"
          />
        </>
      ),
    },
    {
      key: "lab26/trust",
      title: "The canvas trust boundary: capability tokens and dry-run by default",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            Every canvas extension in this repository enforces five security
            invariants between the rendered HTML iframe and the extension host:
          </p>
          <Snippet title="five canvas security invariants">{`1. Read-only iframe: all gh / dotnet calls run in the extension host, never in the page
2. Capability token: mutating actions (dispatch, save_draft, publish) require window.CAPABILITY_TOKEN
3. Escape untrusted text: issue titles and labels pass through escapeHtml() before rendering
4. Dry-run by default: dispatch defaults to dryRun: true and uses an idempotent marker comment
5. Explicit mode badge: Fixture vs. Live mode is visibly labeled with capturedAt provenance`}</Snippet>
          <Quiz
            stepKey="lab26/trust"
            question="Why does the release-composer canvas expose save_draft and publish as two separate actions, and require a capability token on both?"
            options={[
              "Because the Copilot SDK only allows one filesystem call per action",
              "Saving a draft is a reversible local write whereas publishing is an irreversible external GitHub action, and requiring the per-instance capability token prevents an agent with stale or unapproved context from mutating or publishing a canvas it did not open",
              "Capability tokens encrypt the release notes in transit",
            ]}
            correct={1}
            explain="Separating save_draft from publish keeps local iteration safe (just like git commit vs git push), and the per-instance capability token binds mutating actions to the open canvas instance."
          />
          <Note>
            <strong>Lab 26 Complete!</strong> Continue to{" "}
            <strong>
              Lab 27 — Evaluating Agents, Skills, and Models with Vally and
              AgentEvals
            </strong>{" "}
            to close the Track 5 (Labs 21–27) enterprise agentic SDLC harness
            with deterministic Vally program graders, hook guard evaluations,
            AgentEvals specs, and OpenTelemetry evaluation events.
          </Note>
        </>
      ),
    },
  ],
};
