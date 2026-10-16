import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { loadDataset } from '../../labs/fixtures/lab25/lib/ingest.mjs';
import {
  assertFresh, assertRowsMatchSchema, batchRows, ingestionUrl, MAX_AGE_MS, MAX_CALL_BYTES, MAX_FIELD_BYTES,
  planForward, postBatches, restamp,
} from '../../labs/fixtures/lab25/lib/forward.mjs';
import { costPerTask, DEFAULT_CHANGE_AT, reworkRate } from '../../labs/fixtures/lab25/lib/queries.mjs';

const DATA = join(process.cwd(), 'labs/fixtures/lab25/data');
const dataset = loadDataset(DATA);

describe('lab25 forwarder: Logs Ingestion API contract', () => {
  it('posts to the streamDeclarations key, not the _CL output stream', () => {
    const url = ingestionUrl('https://dce.example/', 'dcr-123', 'CopilotSpans');
    expect(url).toBe('https://dce.example/dataCollectionRules/dcr-123/streams/Custom-CopilotSpans?api-version=2023-01-01');
    expect(url).not.toContain('_CL');
    expect(url).not.toContain('ods.opinsights.azure.com');
  });

  it('plans every table under the 1 MB call limit', () => {
    const plan = planForward(dataset);
    expect(plan.map((p: any) => [p.table, p.rows])).toEqual([
      ['CopilotSpans', 464], ['SdlcStageEvents', 86], ['SdlcStepLog', 188], ['SdlcApprovals', 44],
    ]);
    for (const p of plan) for (const b of p.batches) {
      expect(Buffer.byteLength(JSON.stringify(b.rows))).toBeLessThanOrEqual(MAX_CALL_BYTES);
    }
  });

  it('splits batches by bytes and keeps every row', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ i, pad: 'x'.repeat(100) }));
    const batches = batchRows(rows, 1000);
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.flatMap((b: any) => b.rows)).toEqual(rows);
    for (const b of batches) expect(Buffer.byteLength(JSON.stringify(b.rows))).toBeLessThanOrEqual(1000);
  });

  it('refuses a field over 64 KB instead of letting the service truncate it silently', () => {
    const row = { ...dataset.SdlcApprovals[0], Approver: 'x'.repeat(MAX_FIELD_BYTES + 1) };
    expect(() => assertRowsMatchSchema('SdlcApprovals', [row])).toThrow(/silently truncate/);
  });

  it('refuses columns that drift from schema.json', () => {
    const row = { ...dataset.SdlcApprovals[0], NewColumn: 'x' };
    expect(() => assertRowsMatchSchema('SdlcApprovals', [row])).toThrow(/extra: NewColumn/);
  });
});

describe('lab25 forwarder: TimeGenerated freshness', () => {
  const now = Date.parse('2026-10-12T12:00:00Z');

  it('refuses the dated fixture without --restamp', () => {
    expect(() => assertFresh(dataset, now)).toThrow(/--restamp/);
  });

  it('restamps into the last two days, keeping order and the change-point split', () => {
    const { dataset: out, changeAt } = restamp(dataset, DEFAULT_CHANGE_AT, now);
    expect(() => assertFresh(out, now)).not.toThrow();
    const times = Object.values(out).flat().map((r: any) => Date.parse(r.TimeGenerated));
    expect(Math.min(...times)).toBeGreaterThan(now - MAX_AGE_MS);
    expect(Math.max(...times)).toBeLessThan(now);
    const before = (rows: any[], at: string) => rows.filter((r) => Date.parse(r.TimeGenerated) < Date.parse(at)).length;
    expect(before(out.SdlcApprovals, changeAt)).toBe(before(dataset.SdlcApprovals, DEFAULT_CHANGE_AT));
    expect(costPerTask(out, { changeAt }).map((r: { Tasks: number }) => r.Tasks)).toEqual([16, 16]);
    expect(reworkRate(out, { changeAt })).toEqual(reworkRate(dataset));
  });

  it('stops on a non-204 response and names the batch', async () => {
    const plan = [{ table: 'SdlcApprovals', batches: [{ rows: [{}] }] }];
    const fetchImpl = async () => ({ status: 403, text: async () => 'Forbidden' });
    await expect(postBatches(plan, { endpoint: 'https://x', immutableId: 'd', token: 't', fetchImpl }))
      .rejects.toThrow(/SdlcApprovals batch 1\/1: HTTP 403/);
  });
});
