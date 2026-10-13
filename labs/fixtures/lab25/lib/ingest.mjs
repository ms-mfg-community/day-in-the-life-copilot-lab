// Lab 25 — parse Copilot telemetry and SDLC artifacts into rows that match schema.json.
// Zero dependencies: runs with plain `node` (>= 18) on a laptop with no Azure subscription.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const here = new URL('..', import.meta.url);
export const SCHEMA = JSON.parse(readFileSync(new URL('schema.json', here), 'utf8'));

export const CORRELATION_KEY_ATTR = 'contoso.correlation_key';
export const BUNDLE_VERSION_ATTR = 'contoso.bundle.version';
export const STAGES = ['epic', 'feature-spec', 'plan', 'story-tasks', 'implement', 'qa-review', 'rework'];

// OTLP/JSON encodes AnyValue as {stringValue|intValue|doubleValue|boolValue|arrayValue}.
function otlpValue(v = {}) {
  if ('stringValue' in v) return v.stringValue;
  if ('intValue' in v) return Number(v.intValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('boolValue' in v) return v.boolValue;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(otlpValue);
  return undefined;
}

function otlpAttributes(list = []) {
  return Object.fromEntries(list.map((a) => [a.key, otlpValue(a.value)]));
}

const hrTimeToMs = ([sec, nanos]) => sec * 1000 + nanos / 1e6;

// Copilot CLI file exporter (COPILOT_OTEL_FILE_EXPORTER_PATH): one flat span or metric per line.
function fromCopilotFileLine(o) {
  if (o.type !== 'span') return [];
  return [{
    traceId: o.traceId,
    spanId: o.spanId,
    parentSpanId: o.parentSpanId ?? '',
    name: o.name,
    kind: o.kind,
    startMs: hrTimeToMs(o.startTime),
    endMs: hrTimeToMs(o.endTime),
    attributes: o.attributes ?? {},
    statusCode: o.status?.code ?? 0,
    resource: o.resource?.attributes ?? {},
  }];
}

// OpenTelemetry Collector `file` exporter (OTLP/JSON): one ExportTraceServiceRequest per line.
// OTLP numbers span kind from 1 (INTERNAL) where the JS SDK numbers it from 0, so subtract one.
function fromOtlpJsonLine(o) {
  return (o.resourceSpans ?? []).flatMap((rs) => {
    const resource = otlpAttributes(rs.resource?.attributes);
    return (rs.scopeSpans ?? []).flatMap((ss) => (ss.spans ?? []).map((s) => ({
      traceId: s.traceId,
      spanId: s.spanId,
      parentSpanId: s.parentSpanId ?? '',
      name: s.name,
      kind: Math.max(0, (s.kind ?? 0) - 1),
      startMs: Number(BigInt(s.startTimeUnixNano) / 1000n) / 1000,
      endMs: Number(BigInt(s.endTimeUnixNano) / 1000n) / 1000,
      attributes: otlpAttributes(s.attributes),
      statusCode: s.status?.code ?? 0,
      resource,
    })));
  });
}

export function parseSpans(text) {
  return text.split('\n').filter((l) => l.trim()).flatMap((line, i) => {
    let o;
    try {
      o = JSON.parse(line);
    } catch (err) {
      throw new Error(`Telemetry line ${i + 1} is not JSON: ${err.message}`);
    }
    return o.resourceSpans ? fromOtlpJsonLine(o) : fromCopilotFileLine(o);
  });
}

export function splitCorrelationKey(key) {
  const parts = typeof key === 'string' ? key.split('/') : [];
  if (parts.length !== 4 || parts.some((p) => !p)) {
    return { Feature: '', Stage: '', Task: '', RunId: '' };
  }
  const [Feature, Stage, Task, RunId] = parts;
  return { Feature, Stage, Task, RunId };
}

const iso = (ms) => new Date(ms).toISOString();
const str = (v) => (v === undefined || v === null ? '' : String(v));
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function spanToRow(s) {
  const a = s.attributes;
  const key = str(s.resource[CORRELATION_KEY_ATTR]);
  return {
    TimeGenerated: iso(s.startMs),
    TraceId: s.traceId,
    SpanId: s.spanId,
    ParentSpanId: s.parentSpanId,
    SpanName: s.name,
    SpanKind: s.kind,
    DurationMs: Math.round((s.endMs - s.startMs) * 1000) / 1000,
    StatusCode: s.statusCode,
    ConversationId: str(a['gen_ai.conversation.id']),
    AgentName: str(a['gen_ai.agent.name']),
    Model: str(a['gen_ai.request.model'] ?? a['gen_ai.response.model']),
    ToolName: str(a['gen_ai.tool.name']),
    ErrorType: str(a['error.type']),
    InputTokens: num(a['gen_ai.usage.input_tokens']),
    OutputTokens: num(a['gen_ai.usage.output_tokens']),
    NanoAiu: num(a['github.copilot.nano_aiu']),
    CostMultiplier: num(a['github.copilot.cost']),
    CorrelationKey: key,
    ...splitCorrelationKey(key),
    BundleVersion: str(s.resource[BUNDLE_VERSION_ATTR]),
    ServiceVersion: str(s.resource['service.version']),
  };
}

export function stageEventToRow(e) {
  return {
    TimeGenerated: e.at,
    CorrelationKey: str(e.correlation_key),
    Feature: str(e.feature),
    Stage: str(e.stage),
    Task: str(e.task),
    RunId: str(e.run_id),
    FromStage: str(e.from_stage),
    Transition: str(e.transition),
    Actor: str(e.actor),
    Artifact: str(e.artifact),
    ArtifactSha: str(e.artifact_sha),
    Classification: str(e.classification),
  };
}

export function stepLogToRow(runId, e) {
  return {
    TimeGenerated: e.timestamp,
    RunId: runId,
    Event: str(e.event),
    StepId: str(e.step_id),
    StepType: str(e.type),
    Status: str(e.status),
  };
}

export function approvalToRow(r) {
  return {
    TimeGenerated: r.at,
    CorrelationKey: str(r.correlation_key),
    Feature: splitCorrelationKey(r.correlation_key).Feature,
    Gate: str(r.gate),
    RunId: str(r.run_id),
    Verdict: str(r.verdict),
    Approver: str(r.approver),
    ArtifactSha: str(r.artifact_sha),
    Source: str(r.source),
    EscalatedTo: str(r.escalated_to),
  };
}

const readJsonl = (path) => readFileSync(path, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

// Loads a dataset laid out the way the artifacts land in a real repo:
//   copilot-otel.jsonl                         <- CLI file exporter (or collector OTLP/JSON)
//   stage-events/<feature>.jsonl               <- Lab 24 stage signal
//   .specify/workflows/runs/<run_id>/log.jsonl <- Spec Kit run log
//   approvals-of-record.json                   <- Lab 24 approvals of record
export function loadDataset(dir) {
  const spansPath = join(dir, 'copilot-otel.jsonl');
  const stageDir = join(dir, 'stage-events');
  const runsDir = join(dir, '.specify', 'workflows', 'runs');
  const approvalsPath = join(dir, 'approvals-of-record.json');
  const list = (d) => (existsSync(d) ? readdirSync(d).sort() : []);
  return {
    CopilotSpans: existsSync(spansPath) ? parseSpans(readFileSync(spansPath, 'utf8')).map(spanToRow) : [],
    SdlcStageEvents: list(stageDir).filter((f) => f.endsWith('.jsonl'))
      .flatMap((f) => readJsonl(join(stageDir, f)).map(stageEventToRow)),
    SdlcStepLog: list(runsDir).filter((r) => existsSync(join(runsDir, r, 'log.jsonl')))
      .flatMap((r) => readJsonl(join(runsDir, r, 'log.jsonl')).map((e) => stepLogToRow(r, e))),
    SdlcApprovals: existsSync(approvalsPath)
      ? JSON.parse(readFileSync(approvalsPath, 'utf8')).map(approvalToRow)
      : [],
  };
}
