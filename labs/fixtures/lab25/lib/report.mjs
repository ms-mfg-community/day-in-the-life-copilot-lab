// Lab 25 — turn query results into FINDINGS for the interpreting agent (KQL first, agent second).
// The agent receives aggregates and allowlisted identifiers only. Every string that came from
// telemetry is untrusted: a tool name or stage name can carry an injected instruction.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAfter, activity, errors, costDoubleCount, provenance, DEFAULT_CHANGE_AT, MIN_SAMPLE } from './queries.mjs';

const SAFE_IDENTIFIER = /^[A-Za-z0-9._:/@+-]+( [A-Za-z0-9._:/@+-]+)?$/;
export const REDACTED = '[unsafe identifier redacted]';
const RELATIVE_FLAT = 0.05;

export function sanitizeIdentifier(v) {
  if (typeof v !== 'string' || v === '') return v;
  return v.length <= 80 && SAFE_IDENTIFIER.test(v) ? v : REDACTED;
}

// Lower is better for every outcome and cost metric in the pack.
export function direction(m) {
  if (!m.SampleOk) return 'insufficient-sample';
  if (m.Delta === null) return 'no-data';
  const scale = Math.abs(m.Baseline) || 1;
  if (Math.abs(m.Delta) / scale < RELATIVE_FLAT) return 'flat';
  return m.Delta < 0 ? 'improved' : 'regressed';
}

export function buildFindings(t, { changeAt = DEFAULT_CHANGE_AT } = {}) {
  return {
    changeAt,
    minSample: MIN_SAMPLE,
    caveat: 'Observational before/after comparison. Task mix, reviewers, model tiers and team changes are confounders; a delta is a lead to investigate, not proof the change caused it.',
    outcomes: beforeAfter(t, { changeAt }).map((m) => ({ ...m, Direction: direction(m), Query: MEASURED_BY[m.Metric] })),
    costTrap: costDoubleCount(t, { changeAt }),
    activity: activity(t, { changeAt }),
    errors: errors(t).map((e) => ({ ...e, SpanName: sanitizeIdentifier(e.SpanName), ToolName: sanitizeIdentifier(e.ToolName), ErrorType: sanitizeIdentifier(e.ErrorType) })),
    gateOwners: gateOwners(t),
  };
}

// The query id (kql/<id>.kql, `lab25.mjs query <id>`) that re-measures each outcome.
export const MEASURED_BY = {
  qa_reject_rate: 'reject-rate',
  rework_rate: 'rework-rate',
  escalations_per_task: 'escalations',
  review_qa_dwell_p50_minutes: 'stage-dwell',
  cost_p50_aiu_per_task: 'cost-per-task',
  cost_p95_aiu_per_task: 'cost-per-task',
};

// Who decided each gate, from the approvals of record (sanitized, sorted).
export function gateOwners(t) {
  const byGate = new Map();
  for (const a of t.SdlcApprovals) {
    byGate.set(a.Gate, new Set([...(byGate.get(a.Gate) ?? []), sanitizeIdentifier(a.Approver)]));
  }
  return Object.fromEntries([...byGate.keys()].sort().map((g) => [sanitizeIdentifier(g), [...byGate.get(g)].sort()]));
}

// `git hash-object` for a text file, normalizing CRLF so a Windows checkout hashes like Git does.
export function gitBlobSha(content) {
  const body = Buffer.from(content.replace(/\r\n/g, '\n'), 'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${body.length}\0`), body])).digest('hex');
}

function artifactStatus(dir, artifact, sha) {
  if (!artifact || !sha) return '';
  const path = join(dir, artifact);
  if (!existsSync(path)) return 'not in working tree (check history: git cat-file -e <sha>)';
  return gitBlobSha(readFileSync(path, 'utf8')) === sha ? 'matches working tree' : 'earlier revision (check history: git cat-file -e <sha>)';
}

export function verifiedProvenance(t, feature, dir) {
  const stageShas = new Set(t.SdlcStageEvents.filter((e) => e.Feature === feature && e.ArtifactSha).map((e) => e.ArtifactSha));
  return provenance(t, feature).map((r) => ({
    ...r,
    Verified: r.Kind === 'stage'
      ? artifactStatus(dir, r.Artifact, r.ArtifactSha)
      : r.Kind === 'approval' && r.ArtifactSha
        ? (stageShas.has(r.ArtifactSha) ? 'decision on a recorded stage artifact' : 'NO matching stage artifact')
        : '',
  }));
}

const fmt = (v) => (v === null || v === undefined ? '—' : String(v));

export function table(rows) {
  if (rows.length === 0) return '_no rows_';
  const cols = Object.keys(rows[0]);
  return [
    `| ${cols.join(' | ')} |`,
    `| ${cols.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${cols.map((c) => fmt(r[c]).replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

export function renderFindings(f) {
  return [
    `## Outcomes — baseline vs after (change at ${f.changeAt})`,
    '',
    table(f.outcomes),
    '',
    `> ${f.caveat} Rows with SampleOk=false have fewer than ${f.minSample} observations in a window.`,
    '',
    '## Cost trap — root-only vs summing every span (AIU, not currency)',
    '',
    table(f.costTrap),
    '',
    '## Errors',
    '',
    table(f.errors),
    '',
    '## Activity (volume, NOT an outcome)',
    '',
    table(f.activity),
  ].join('\n');
}
