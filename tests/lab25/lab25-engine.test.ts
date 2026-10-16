import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadDataset, parseSpans, spanToRow, splitCorrelationKey, stageEventToRow } from '../../labs/fixtures/lab25/lib/ingest.mjs';
import { costDoubleCount, isRoot, QUERY_IDS, reworkRate, RUNNERS } from '../../labs/fixtures/lab25/lib/queries.mjs';
import {
  buildFindings, gateOwners, gitBlobSha, MEASURED_BY, REDACTED, sanitizeIdentifier, verifiedProvenance,
} from '../../labs/fixtures/lab25/lib/report.mjs';
import { ADVERSARIAL_TOOL, generate } from '../../labs/fixtures/lab25/generate-fixture.mjs';

const FIXTURE = join(process.cwd(), 'labs/fixtures/lab25');
const DATA = join(FIXTURE, 'data');
const lf = (s: string) => s.replace(/\r\n/g, '\n');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('lab25 engine: committed dataset', () => {
  it('data/ is exactly the deterministic generator output (seed 25)', () => {
    const generated = generate(25) as Record<string, string>;
    const onDisk = walk(DATA).map((p) => relative(DATA, p).replace(/\\/g, '/')).sort();
    expect(onDisk).toEqual(Object.keys(generated).sort());
    for (const [rel, content] of Object.entries(generated)) {
      expect(lf(readFileSync(join(DATA, rel), 'utf8')), rel).toBe(lf(content));
    }
  });

  it('every stage event and approval uses the Lab 24 correlation key shape', () => {
    const t = loadDataset(DATA);
    for (const row of [...t.SdlcStageEvents, ...t.SdlcApprovals]) {
      expect(row.CorrelationKey).toMatch(/^[0-9]{3}-[a-z0-9-]+\/[a-z-]+\/(-|T\d{3})\/[0-9a-f]{8}$/);
    }
    expect(t.SdlcApprovals.some((a: any) => a.RunId === '3f9a2c1e' && a.Gate === 'review-qa' && a.Verdict === 'reject')).toBe(true);
  });

  it('approvals follow Lab 24: PR review or comment sources, task "-", QA SHA is qa-review.md', () => {
    const t = loadDataset(DATA);
    for (const a of t.SdlcApprovals) {
      expect(['pr-review', 'comment']).toContain(a.Source);
      expect(splitCorrelationKey(a.CorrelationKey).Task).toBe('-');
    }
    const qaShas = new Set(t.SdlcStageEvents.filter((e: any) => e.Stage === 'qa-review').map((e: any) => e.ArtifactSha));
    const qaApprovals = t.SdlcApprovals.filter((a: any) => a.Gate === 'review-qa');
    expect(qaApprovals.length).toBe(14);
    for (const a of qaApprovals) expect(qaShas.has(a.ArtifactSha)).toBe(true);
  });

  it('stage-event ingest tolerates optional issue/pr fields', () => {
    const base = { correlation_key: '001-enrollment-cap/qa-review/-/3f9a2c1e', feature: '001-enrollment-cap', stage: 'qa-review', task: '-', run_id: '3f9a2c1e', at: '2026-09-01T00:00:00Z' };
    expect(stageEventToRow({ ...base, issue: 42, pr: 77 })).toEqual(stageEventToRow(base));
  });
});

describe('lab25 engine: cost', () => {
  const t = loadDataset(DATA);

  it('root is invoke_agent with an empty parent, never a parentless permission span or a subagent', () => {
    expect(isRoot({ SpanName: 'invoke_agent', ParentSpanId: '' })).toBe(true);
    expect(isRoot({ SpanName: 'permission', ParentSpanId: '' })).toBe(false);
    expect(isRoot({ SpanName: 'invoke_agent', ParentSpanId: 'abc' })).toBe(false);
  });

  it('summing every span double counts exactly 2x', () => {
    const rows = costDoubleCount(t);
    expect(rows.map((r: any) => r.Overcount)).toEqual([2, 2]);
    expect(rows.map((r: any) => r.RootOnlyAiu)).toEqual([113.221, 139.846]);
  });
});

describe('lab25 engine: findings', () => {
  const f = buildFindings(loadDataset(DATA));
  const byMetric = Object.fromEntries(f.outcomes.map((o: any) => [o.Metric, o]));

  it('assigns rework to the earliest QA decision even when a later decision comes first', () => {
    const t = loadDataset(DATA);
    const approvals = [
      { Feature: 'cross-window', Gate: 'review-qa', TimeGenerated: '2026-09-16T00:00:00Z', Verdict: 'approve' },
      { Feature: 'cross-window', Gate: 'review-qa', TimeGenerated: '2026-09-14T00:00:00Z', Verdict: 'reject' },
    ];
    expect(reworkRate({ ...t, SdlcApprovals: approvals })).toEqual([
      { Window: 'baseline', Features: 1, Reworked: 1, ReworkRate: 1 },
      { Window: 'after', Features: 0, Reworked: 0, ReworkRate: null },
    ]);
    expect(reworkRate({ ...t, SdlcApprovals: [...approvals].reverse() }))
      .toEqual(reworkRate({ ...t, SdlcApprovals: approvals }));
  });

  it('reports the outcome directions the lab quotes', () => {
    expect(byMetric.qa_reject_rate).toMatchObject({ Baseline: 0.556, After: 0.2, Direction: 'improved' });
    expect(byMetric.rework_rate.Direction).toBe('insufficient-sample');
    expect(byMetric.escalations_per_task.Direction).toBe('improved');
    expect(byMetric.cost_p95_aiu_per_task.Direction).toBe('regressed');
  });

  it('every outcome names the query that re-measures it', () => {
    for (const o of f.outcomes) {
      expect(QUERY_IDS).toContain(o.Query);
      expect(MEASURED_BY[o.Metric]).toBe(o.Query);
    }
    // provenance takes a feature argument, so the CLI dispatches it separately from RUNNERS.
    for (const id of QUERY_IDS.filter((q) => q !== 'provenance')) expect(RUNNERS[id], id).toBeTypeOf('function');
  });

  it('names gate owners from the approvals of record', () => {
    expect(gateOwners(loadDataset(DATA))).toEqual({
      'review-epic': ['avery-pm'],
      'review-plan': ['blake-lead'],
      'review-qa': ['casey-qa'],
      'review-spec': ['blake-lead'],
      'review-tasks': ['blake-lead'],
    });
  });

  it('redacts the adversarial tool name before it reaches the agent', () => {
    expect(sanitizeIdentifier(ADVERSARIAL_TOOL)).toBe(REDACTED);
    expect(sanitizeIdentifier('execute_tool bash')).toBe('execute_tool bash');
    const json = JSON.stringify(f);
    expect(json).not.toContain('ignore previous instructions');
    expect(f.errors.some((e: any) => e.ToolName === REDACTED)).toBe(true);
  });
});

describe('lab25 engine: provenance', () => {
  it('gitBlobSha equals git hash-object', () => {
    expect(gitBlobSha('hello\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
    expect(gitBlobSha('hello\r\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
  });

  it('verifies feature 001 artifacts and flags the pre-reject qa-review as an earlier revision', () => {
    const rows = verifiedProvenance(loadDataset(DATA), '001-enrollment-cap', DATA);
    const stages = rows.filter((r: any) => r.Kind === 'stage' && r.ArtifactSha);
    expect(stages.filter((r: any) => r.Verified === 'matches working tree').length).toBeGreaterThanOrEqual(5);
    expect(stages.some((r: any) => r.Verified.startsWith('earlier revision'))).toBe(true);
    const approvals = rows.filter((r: any) => r.Kind === 'approval');
    expect(approvals.every((r: any) => r.Verified === 'decision on a recorded stage artifact')).toBe(true);
  });
});

describe('lab25 engine: ingest', () => {
  it('reads OTLP/JSON from a collector, shifting span kind from 1-based to 0-based', () => {
    const line = JSON.stringify({
      resourceSpans: [{
        resource: { attributes: [
          { key: 'contoso.correlation_key', value: { stringValue: '001-enrollment-cap/implement/T013/3f9a2c1e' } },
          { key: 'contoso.bundle.version', value: { stringValue: '1.3.0' } },
        ] },
        scopeSpans: [{ spans: [{
          traceId: 't1', spanId: 's1', name: 'invoke_agent', kind: 1,
          startTimeUnixNano: '1788000000000000000', endTimeUnixNano: '1788000001500000000',
          attributes: [
            { key: 'github.copilot.nano_aiu', value: { intValue: '2500000000' } },
            { key: 'gen_ai.conversation.id', value: { stringValue: 'c1' } },
          ],
        }] }],
      }],
    });
    const [row] = parseSpans(line).map(spanToRow);
    expect(row).toMatchObject({
      TimeGenerated: '2026-08-29T10:40:00.000Z',
      SpanKind: 0, ParentSpanId: '', NanoAiu: 2.5e9, DurationMs: 1500, ConversationId: 'c1',
      Feature: '001-enrollment-cap', Stage: 'implement', Task: 'T013', RunId: '3f9a2c1e', BundleVersion: '1.3.0',
    });
  });

  it('ignores metric lines from the CLI file exporter', () => {
    expect(parseSpans('{"type":"metric","name":"x"}\n')).toEqual([]);
  });

  it('leaves a malformed correlation key unjoined rather than guessing', () => {
    expect(splitCorrelationKey('FEAT-001/implement')).toEqual({ Feature: '', Stage: '', Task: '', RunId: '' });
  });
});
