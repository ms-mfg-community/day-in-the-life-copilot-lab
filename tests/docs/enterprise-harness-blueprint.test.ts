import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DOC = join(process.cwd(), 'docs/enterprise-harness-blueprint.md');
const STATUS = /^\**(Supported product|Preview|You build this)\b/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function ledgerRows(body: string): string[][] {
  const ledger = body.split(/^## 3\. /m)[1].split(/^## 4\. /m)[0];
  return ledger
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.startsWith('| Capability') && !line.startsWith('|---'))
    .map((line) => line.replace(/^\|\s*|\s*\|\s*$/g, '').split(' | ').map((cell) => cell.trim()));
}

describe('docs/enterprise-harness-blueprint.md', () => {
  const body = readFileSync(DOC, 'utf8');
  const rows = ledgerRows(body);

  it('has a non-trivial native-vs-DIY ledger', () => {
    expect(rows.length).toBeGreaterThan(30);
  });

  it('gives every ledger row a status, a primary source and a verification date', () => {
    for (const [capability, status, source, verified] of rows) {
      expect(status, capability).toMatch(STATUS);
      expect(verified, capability).toMatch(DATE);
      expect(source, capability).toMatch(/\]\(https:\/\//);
    }
  });

  it('names both non-native requirements', () => {
    expect(body).toMatch(/### 5\.1 Per-task agent and model binding/);
    expect(body).toMatch(/### 5\.2 Stage-order enforcement/);
    expect(body).toMatch(/completeness at merge, not order in chat/);
  });
});
