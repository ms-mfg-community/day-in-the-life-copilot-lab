// Lab 25 — offline SEMANTIC MIRROR of the KQL pack in ../kql/.
//
// This is not a KQL engine. Each function below re-implements one kql/<id>.kql file in
// JavaScript so the lab completes with no Azure subscription. The .kql files are canonical;
// tests/lab25 checks that every query id exists in both places and reads the same columns.
// Percentiles here use nearest-rank; Kusto's percentile() is an estimate, so on large data
// the Azure numbers can differ slightly from these.

export const DEFAULT_CHANGE_AT = '2026-09-15T00:00:00Z';
export const MIN_SAMPLE = 5;
export const NANO_PER_AIU = 1e9;
export const QUERY_IDS = [
  'cost-per-task', 'cost-double-count', 'reject-rate', 'rework-rate', 'stage-dwell',
  'escalations', 'before-after', 'errors', 'activity', 'provenance',
];

export function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

const round = (v, dp = 3) => (v === null ? null : Math.round(v * 10 ** dp) / 10 ** dp);
const windowOf = (time, changeAt) => (Date.parse(time) < Date.parse(changeAt) ? 'baseline' : 'after');
const WINDOWS = ['baseline', 'after'];

function groupBy(rows, keyFn) {
  return rows.reduce((m, r) => {
    const k = keyFn(r);
    return m.set(k, [...(m.get(k) ?? []), r]);
  }, new Map());
}

// The root session span. `permission` spans also have no parent, so the name matters too.
export const isRoot = (s) => s.SpanName === 'invoke_agent' && s.ParentSpanId === '';
const isTaskScoped = (r) => r.Task !== '' && r.Task !== '-';

function taskCosts(t, changeAt) {
  const roots = t.CopilotSpans.filter((s) => isRoot(s) && isTaskScoped(s));
  const byTask = groupBy(roots, (s) => `${windowOf(s.TimeGenerated, changeAt)}|${s.Feature}|${s.Task}`);
  return [...byTask].map(([k, spans]) => ({
    Window: k.split('|')[0],
    TaskAiu: spans.reduce((sum, s) => sum + s.NanoAiu, 0) / NANO_PER_AIU,
  }));
}

export function costPerTask(t, { changeAt = DEFAULT_CHANGE_AT } = {}) {
  const tasks = taskCosts(t, changeAt);
  return WINDOWS.map((Window) => {
    const v = tasks.filter((x) => x.Window === Window).map((x) => x.TaskAiu);
    return {
      Window, Tasks: v.length,
      P50Aiu: round(percentile(v, 50)), P95Aiu: round(percentile(v, 95)), MaxAiu: round(v.length ? Math.max(...v) : null),
    };
  });
}

export function costDoubleCount(t, { changeAt = DEFAULT_CHANGE_AT } = {}) {
  return WINDOWS.map((Window) => {
    const spans = t.CopilotSpans.filter((s) => windowOf(s.TimeGenerated, changeAt) === Window);
    const rootOnly = spans.filter(isRoot).reduce((a, s) => a + s.NanoAiu, 0) / NANO_PER_AIU;
    const allSpans = spans.reduce((a, s) => a + s.NanoAiu, 0) / NANO_PER_AIU;
    return { Window, RootOnlyAiu: round(rootOnly), AllSpansAiu: round(allSpans), Overcount: round(rootOnly ? allSpans / rootOnly : null, 2) };
  });
}

export function rejectRate(t, { changeAt = DEFAULT_CHANGE_AT } = {}) {
  const groups = groupBy(t.SdlcApprovals, (a) => `${windowOf(a.TimeGenerated, changeAt)}|${a.Gate}`);
  return [...groups].map(([k, rows]) => {
    const [Window, Gate] = k.split('|');
    const Rejects = rows.filter((r) => r.Verdict === 'reject').length;
    return { Window, Gate, Decisions: rows.length, Rejects, RejectRate: round(Rejects / rows.length) };
  }).sort((a, b) => WINDOWS.indexOf(a.Window) - WINDOWS.indexOf(b.Window) || a.Gate.localeCompare(b.Gate));
}

export function reworkRate(t, { changeAt = DEFAULT_CHANGE_AT } = {}) {
  const qa = t.SdlcApprovals.filter((a) => a.Gate === 'review-qa');
  const features = groupBy(qa, (a) => a.Feature);
  return WINDOWS.map((Window) => {
    const inWindow = [...features.values()].filter((rows) => windowOf(rows[0].TimeGenerated, changeAt) === Window);
    const Reworked = inWindow.filter((rows) => rows.some((r) => r.Verdict === 'reject')).length;
    return { Window, Features: inWindow.length, Reworked, ReworkRate: round(inWindow.length ? Reworked / inWindow.length : null) };
  });
}

// Pairs each step_started with the step_completed that immediately follows it for the same
// run and step. A gate rejected with `on_reject: retry` logs step_completed status=paused and,
// on resume, a fresh step_started — so every attempt is its own pair. Unpaired starts are dropped.
export function stepAttempts(t) {
  const log = t.SdlcStepLog.filter((e) => e.Event === 'step_started' || e.Event === 'step_completed')
    .sort((a, b) => a.RunId.localeCompare(b.RunId) || a.StepId.localeCompare(b.StepId) || a.TimeGenerated.localeCompare(b.TimeGenerated));
  return log.flatMap((e, i) => {
    const prev = log[i - 1];
    const paired = e.Event === 'step_completed' && prev?.Event === 'step_started' && prev.RunId === e.RunId && prev.StepId === e.StepId;
    return paired ? [{ RunId: e.RunId, StepId: e.StepId, Started: prev.TimeGenerated, Status: e.Status, Minutes: (Date.parse(e.TimeGenerated) - Date.parse(prev.TimeGenerated)) / 60000 }] : [];
  });
}

export function stageDwell(t, { changeAt = DEFAULT_CHANGE_AT } = {}) {
  const groups = groupBy(stepAttempts(t), (a) => `${windowOf(a.Started, changeAt)}|${a.StepId}`);
  return [...groups].map(([k, rows]) => {
    const [Window, StepId] = k.split('|');
    return { Window, StepId, Attempts: rows.length, P50Minutes: round(percentile(rows.map((r) => r.Minutes), 50), 1) };
  }).sort((a, b) => WINDOWS.indexOf(a.Window) - WINDOWS.indexOf(b.Window) || a.StepId.localeCompare(b.StepId));
}

export function escalations(t, { changeAt = DEFAULT_CHANGE_AT } = {}) {
  return WINDOWS.map((Window) => {
    const tasks = new Set(t.SdlcStageEvents
      .filter((e) => e.Stage === 'implement' && isTaskScoped(e) && windowOf(e.TimeGenerated, changeAt) === Window)
      .map((e) => `${e.Feature}|${e.Task}`));
    const Escalations = t.SdlcApprovals.filter((a) => a.EscalatedTo !== '' && windowOf(a.TimeGenerated, changeAt) === Window).length;
    return { Window, Tasks: tasks.size, Escalations, EscalationsPerTask: round(tasks.size ? Escalations / tasks.size : null) };
  });
}

export function errors(t) {
  const failed = t.CopilotSpans.filter((s) => s.StatusCode === 2 || s.ErrorType !== '');
  const groups = groupBy(failed, (s) => `${s.SpanName}\u0000${s.ToolName}\u0000${s.ErrorType}`);
  return [...groups].map(([k, rows]) => {
    const [SpanName, ToolName, ErrorType] = k.split('\u0000');
    return { SpanName, ToolName, ErrorType, Count: rows.length };
  }).sort((a, b) => b.Count - a.Count || a.SpanName.localeCompare(b.SpanName));
}

// ACTIVITY, not outcome: volume says how busy the agents were, not whether delivery improved.
export function activity(t, { changeAt = DEFAULT_CHANGE_AT } = {}) {
  return WINDOWS.map((Window) => {
    const spans = t.CopilotSpans.filter((s) => windowOf(s.TimeGenerated, changeAt) === Window);
    const roots = spans.filter(isRoot);
    return {
      Window, Kind: 'activity', Sessions: roots.length,
      ChatCalls: spans.filter((s) => s.SpanName.startsWith('chat')).length,
      ToolCalls: spans.filter((s) => s.SpanName.startsWith('execute_tool')).length,
      InputTokens: roots.reduce((a, s) => a + s.InputTokens, 0),
      OutputTokens: roots.reduce((a, s) => a + s.OutputTokens, 0),
    };
  });
}

function metric(Metric, Kind, b, a, nb, na) {
  const enough = nb >= MIN_SAMPLE && na >= MIN_SAMPLE;
  return { Metric, Kind, Baseline: b, After: a, Delta: b === null || a === null ? null : round(a - b), NBaseline: nb, NAfter: na, SampleOk: enough };
}

export function beforeAfter(t, opts = {}) {
  const [cb, ca] = costPerTask(t, opts);
  const qa = rejectRate(t, opts).filter((r) => r.Gate === 'review-qa');
  const qb = qa.find((r) => r.Window === 'baseline');
  const qaa = qa.find((r) => r.Window === 'after');
  const [rb, ra] = reworkRate(t, opts);
  const [eb, ea] = escalations(t, opts);
  const dwell = stageDwell(t, opts).filter((r) => r.StepId === 'review-qa');
  const db = dwell.find((r) => r.Window === 'baseline');
  const da = dwell.find((r) => r.Window === 'after');
  return [
    metric('qa_reject_rate', 'outcome', qb?.RejectRate ?? null, qaa?.RejectRate ?? null, qb?.Decisions ?? 0, qaa?.Decisions ?? 0),
    metric('rework_rate', 'outcome', rb.ReworkRate, ra.ReworkRate, rb.Features, ra.Features),
    metric('escalations_per_task', 'outcome', eb.EscalationsPerTask, ea.EscalationsPerTask, eb.Tasks, ea.Tasks),
    metric('review_qa_dwell_p50_minutes', 'outcome', db?.P50Minutes ?? null, da?.P50Minutes ?? null, db?.Attempts ?? 0, da?.Attempts ?? 0),
    metric('cost_p50_aiu_per_task', 'cost', cb.P50Aiu, ca.P50Aiu, cb.Tasks, ca.Tasks),
    metric('cost_p95_aiu_per_task', 'cost', cb.P95Aiu, ca.P95Aiu, cb.Tasks, ca.Tasks),
  ];
}

// Reconstructs one feature's history from durable artifacts only: stage signal, approvals of
// record and the version-stamped sessions. Nothing is re-run.
export function provenance(t, feature) {
  const stage = t.SdlcStageEvents.filter((e) => e.Feature === feature).map((e) => ({
    Time: e.TimeGenerated, Kind: 'stage', CorrelationKey: e.CorrelationKey, Detail: `${e.Transition} ${e.FromStage || '(start)'} -> ${e.Stage}${e.Classification ? ` [${e.Classification}]` : ''}`,
    Who: e.Actor, Artifact: e.Artifact, ArtifactSha: e.ArtifactSha, BundleVersion: '',
  }));
  const approvals = t.SdlcApprovals.filter((a) => a.Feature === feature).map((a) => ({
    Time: a.TimeGenerated, Kind: 'approval', CorrelationKey: a.CorrelationKey, Detail: `${a.Gate} ${a.Verdict} via ${a.Source}${a.EscalatedTo ? ` escalated to ${a.EscalatedTo}` : ''}`,
    Who: a.Approver, Artifact: '', ArtifactSha: a.ArtifactSha, BundleVersion: '',
  }));
  const sessions = [...groupBy(t.CopilotSpans.filter((s) => isRoot(s) && s.Feature === feature), (s) => s.CorrelationKey)]
    .map(([key, roots]) => ({
      Time: roots.map((r) => r.TimeGenerated).sort()[0], Kind: 'sessions', CorrelationKey: key,
      Detail: `${roots.length} session(s), ${round(roots.reduce((a, r) => a + r.NanoAiu, 0) / NANO_PER_AIU)} AIU`,
      Who: '', Artifact: '', ArtifactSha: '', BundleVersion: [...new Set(roots.map((r) => r.BundleVersion))].join(','),
    }));
  return [...stage, ...approvals, ...sessions].sort((a, b) => a.Time.localeCompare(b.Time) || a.Kind.localeCompare(b.Kind));
}

export const RUNNERS = {
  'cost-per-task': costPerTask,
  'cost-double-count': costDoubleCount,
  'reject-rate': rejectRate,
  'rework-rate': reworkRate,
  'stage-dwell': stageDwell,
  escalations,
  'before-after': beforeAfter,
  errors,
  activity,
};
