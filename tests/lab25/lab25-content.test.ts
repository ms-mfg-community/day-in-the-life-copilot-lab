import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LAB = readFileSync(join(process.cwd(), 'labs/lab25.md'), 'utf8').replace(/\r\n/g, '\n');

// U5's acceptance criteria that are claims in prose, not behaviour in code.
const MUST_SAY: Record<string, RegExp> = {
  'data goes to your collector': /data goes to your collector\. GitHub doesn't receive or store it/i,
  'no execute_hook span': /no `execute_hook` span/,
  'cost is a multiplier, not currency': /`github\.copilot\.cost`.*\*\*multiplier\*\*, not currency/,
  'root-only AIU': /root `invoke_agent` span only/i,
  'capture is a governance decision with a named approver': /governance decision[\s\S]{0,200}named privacy or security approver/,
  'lockCaptureContent': /lockCaptureContent/,
  'Q1 recorded as untested': /Open question Q1 \(untested\)/,
  'stage events labelled you build this': /\*you build this\*/i,
  'rejects from approvals of record, not run state': /Rejects come from the approval of record, not run state/,
  'Analytics plan mandated': /Use the Analytics plan/,
  'Basic/Auxiliary restrictions': /`join`, `search`, `find`[\s\S]{0,60}`externaldata`/,
  '64 KB silent truncation': /64 KB[\s\S]{0,40}silently truncated/,
  'no schema drift handling': /No schema drift handling/,
  'streamDeclarations key': /`streamDeclarations` key/,
  'role on the DCR': /Monitoring Metrics Publisher goes on the \*\*DCR\*\*/,
  'HTTP Data Collector end of support': /HTTP Data Collector API[\s\S]{0,80}2026-09-14/,
  'not an ingestion shutdown': /wasn't an ingestion shutdown/,
  'TLS 1.2 since 2026-03-01': /since 2026-03-01 it rejects clients that can't\s+negotiate TLS 1\.2/,
  'legacy metrics sunset': /legacy metrics APIs sunset 2026-04-02/,
  'audit log _document_id': /`_document_id`/,
  'Usage Records gated': /EMU or GHEC with data residency/,
  'Actions has no OTel': /Emit OTel/,
  'legacy alert API retired': /legacy alert API retired 2025-10-01/,
  'Grafana preview': /Grafana dashboards are preview/,
  'KQL first, agent second': /KQL first, agent second/,
  'Azure MCP Log Analytics tool': /Log Analytics: Query workspace logs/,
  'NL to KQL unverified': /unverified/,
  'recommendation closes only when re-measured': /closes only when that re-measurement/,
  'activity is not outcome': /Activity isn't outcome/,
  'restamp': /--restamp/,
};

describe('lab25 content: U5 claims the lab must make', () => {
  it.each(Object.entries(MUST_SAY))('%s', (_label, re) => {
    expect(LAB).toMatch(re);
  });

  it('chains to Labs 19, 20, 21, 24 and 26', () => {
    for (const n of [19, 20, 21, 24, 26]) expect(LAB).toContain(`](lab${n}.md)`);
  });

  it('dates its verified claims', () => {
    expect((LAB.match(/[Vv]erified 2026-\d{2}-\d{2}/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('keeps the arc frontmatter and registry reference', () => {
    expect(LAB).toMatch(/^---\ntitle: "Telemetry, Log Analytics & the Improvement Loop"\nlab_number: 25\n/);
    expect(LAB).toContain('registry: docs/_meta/registry.yaml');
    expect(LAB).not.toMatch(/🚧 \*\*Stub/);
  });
});
