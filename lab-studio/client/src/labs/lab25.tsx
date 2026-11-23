import { FileCard, Note, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

const TELEMETRY_SETTINGS = `{
  "telemetry": {
    "enabled": true,
    "endpoint": "https://otel.contoso.example",
    "protocol": "http/protobuf",
    "capture": {
      "identity": false,
      "prompts": false,
      "responses": false,
      "toolArguments": false,
      "toolOutput": false,
      "policyDetail": false
    },
    "captureContent": false,
    "lockCaptureContent": true,
    "serviceName": "copilot-enterprise",
    "resourceAttributes": {
      "deployment.environment": "production",
      "contoso.bundle.version": "1.3.0"
    },
    "headers": {}
  }
}
`;

export const lab25: Lab = {
  id: "lab25",
  number: "25",
  title: "Telemetry, Log Analytics & the Improvement Loop",
  tagline:
    "Copilot OpenTelemetry spans, the 2× AIU double-count trap, KQL outcome joins, and evidence-backed harness reviews.",
  steps: [
    {
      key: "lab25/telemetry",
      title: "Governed telemetry settings and the span hierarchy",
      kind: "mixed",
      verifyId: "lab25/telemetry",
      body: (
        <>
          <p>
            Copilot CLI exports OpenTelemetry traces when{" "}
            <code>COPILOT_OTEL_ENABLED=true</code>,{" "}
            <code>OTEL_EXPORTER_OTLP_ENDPOINT</code>, or{" "}
            <code>COPILOT_OTEL_FILE_EXPORTER_PATH</code> is set. Each turn emits
            a root <code>invoke_agent</code> span with child{" "}
            <code>chat &lt;model&gt;</code> and{" "}
            <code>execute_tool &lt;tool&gt;</code> spans:
          </p>
          <Snippet title="span tree and the 2× AIU double-count trap">{`invoke_agent (root, ParentSpanId == "")   ← carries the turn's total github.copilot.nano_aiu
├── chat claude-haiku-4.5                 ← ALSO carries nano_aiu for that model call
└── execute_tool bash                     ← tool execution and error.type

CRITICAL: Always filter SpanName == "invoke_agent" and isempty(ParentSpanId)
when summing AIU. Summing all spans double-counts every chat span (2×).`}</Snippet>
          <p>
            Author the governed <code>telemetry</code> managed-settings block
            with all six fine-grained <code>capture</code> classes off, legacy{" "}
            <code>captureContent: false</code> for VS Code compatibility,{" "}
            <code>lockCaptureContent: true</code>, and the bundle version
            stamped in <code>resourceAttributes</code>:
          </p>
          <FileCard
            path="enterprise/managed-settings.telemetry.json"
            content={TELEMETRY_SETTINGS}
            label="enterprise/managed-settings.telemetry.json"
          />
        </>
      ),
    },
    {
      key: "lab25/kql",
      title: "Joining spans to durable outcomes and guarding small samples",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            Spans measure activity and cost, not SDLC outcomes. Lab 25 joins
            four custom Log Analytics tables on the shared{" "}
            <code>correlation_key</code> (
            <code>&lt;feature&gt;/&lt;stage&gt;/&lt;task&gt;/&lt;run&gt;</code>
            ):
          </p>
          <table>
            <thead>
              <tr>
                <th>Table</th>
                <th>Source</th>
                <th>What it answers</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>CopilotSpans_CL</code>
                </td>
                <td>Copilot OTel exporter</td>
                <td>
                  Root-only AIU per task, model usage, tool error rates
                </td>
              </tr>
              <tr>
                <td>
                  <code>SdlcStageEvents_CL</code>
                </td>
                <td>
                  <code>stage-events/*.jsonl</code>
                </td>
                <td>Stage transitions, rework counts, artifact blob SHAs</td>
              </tr>
              <tr>
                <td>
                  <code>SdlcStepLog_CL</code>
                </td>
                <td>
                  Spec Kit <code>log.jsonl</code>
                </td>
                <td>Per-stage dwell time (p50/p95)</td>
              </tr>
              <tr>
                <td>
                  <code>SdlcApprovals_CL</code>
                </td>
                <td>Authentic PR reviews/comments</td>
                <td>True QA reject rate and spec-scope escalations</td>
              </tr>
            </tbody>
          </table>
          <Note tone="warn">
            <strong>Three statistical &amp; operational guards:</strong> (1) any
            window with fewer than 5 observations is flagged{" "}
            <code>insufficient-sample</code> rather than declared an
            improvement; (2) Azure Monitor rewrites{" "}
            <code>TimeGenerated</code> older than 2 days on ingestion, so replay
            historical fixtures with <code>--restamp</code>; (3) telemetry
            strings (tool names, paths) are untrusted input and must be redacted
            against a safe identifier pattern before reaching the improvement
            workflow prompt.
          </Note>
          <Quiz
            stepKey="lab25/kql"
            question="A dashboard query sums github.copilot.nano_aiu across every row in CopilotSpans_CL and reports 226.4 AIU instead of the true 113.2 AIU. What caused the 2× overcount?"
            options={[
              "Log Analytics duplicates rows unless deduplicate() is called",
              "Both the root invoke_agent span and its child chat spans carry nano_aiu, and permission spans also have an empty ParentSpanId — cost queries must filter SpanName == 'invoke_agent' and isempty(ParentSpanId)",
              "github.copilot.cost was summed instead of github.copilot.nano_aiu",
            ]}
            correct={1}
            explain="The root invoke_agent span already totals its child chat spans' nano_aiu, and permission spans also have empty ParentSpanId. Filtering SpanName == 'invoke_agent' and isempty(ParentSpanId) isolates the true turn total."
          />
        </>
      ),
    },
  ],
};
