import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { LOGS_INGESTION_API_VERSION } from '../../labs/fixtures/lab25/lib/forward.mjs';
import { QUERY_IDS } from '../../labs/fixtures/lab25/lib/queries.mjs';

const ROOT = process.cwd();
const FIXTURE = join(ROOT, 'labs/fixtures/lab25');
const registry = yaml.load(readFileSync(join(ROOT, 'docs/_meta/registry.yaml'), 'utf8')) as any;
const am = registry.azure_monitor;
const bicep = readFileSync(join(FIXTURE, 'bicep/main.bicep'), 'utf8');
const schema = JSON.parse(readFileSync(join(FIXTURE, 'schema.json'), 'utf8'));

// Bicep can't read YAML, so it repeats the registry's versions as literals. This is the guard.
const BICEP_TYPES: Record<string, string> = {
  'Microsoft.OperationalInsights/workspaces': am.log_analytics_workspaces_api_version,
  'Microsoft.OperationalInsights/workspaces/tables': am.workspaces_tables_api_version,
  'Microsoft.Insights/dataCollectionRules': am.data_collection_rules_api_version,
  'Microsoft.Insights/scheduledQueryRules': am.scheduled_query_rules_api_version,
  'Microsoft.Insights/workbooks': am.workbooks_api_version,
  'Microsoft.Authorization/roleAssignments': am.role_assignments_api_version,
};

describe('lab25 azure: API versions come from the registry', () => {
  it.each(Object.entries(BICEP_TYPES))('%s uses the registry version', (type, version) => {
    expect(version, `registry azure_monitor key for ${type}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const used = [...bicep.matchAll(new RegExp(`'${type.replace(/\//g, '\\/')}@([^']+)'`, 'g'))].map((m) => m[1]);
    expect(used.length, `${type} not declared in main.bicep`).toBeGreaterThan(0);
    expect(new Set(used)).toEqual(new Set([version]));
  });

  it('declares no resource type the registry does not pin', () => {
    const types = [...bicep.matchAll(/'([A-Za-z.]+\/[A-Za-z/]+)@[^']+'/g)].map((m) => m[1]);
    for (const t of types) expect(Object.keys(BICEP_TYPES), t).toContain(t);
  });

  it('the forwarder uses the registry data-plane version', () => {
    expect(LOGS_INGESTION_API_VERSION).toBe(am.logs_ingestion_data_plane_api_version);
  });
});

describe('lab25 azure: the constraints U5 mandates', () => {
  it('puts every table on the Analytics plan', () => {
    expect(bicep).toMatch(/plan:\s*'Analytics'/);
    expect(bicep).not.toMatch(/plan:\s*'(Basic|Auxiliary)'/);
  });

  it('uses a Direct DCR and the Logs Ingestion streams', () => {
    expect(bicep).toMatch(/kind:\s*'Direct'/);
    expect(bicep).toMatch(/Custom-\$\{/);
  });

  it('assigns Monitoring Metrics Publisher scoped to the DCR', () => {
    expect(bicep).toContain('3913510d-42f4-4e42-8a64-420c390055eb');
    expect(bicep).toMatch(/scope:\s*dcr/);
  });

  it('alerts on p95 cost with a LogAlert scheduled query rule', () => {
    expect(bicep).toMatch(/kind:\s*'LogAlert'/);
    expect(bicep).toContain("loadTextContent('../kql/alert-cost-p95.kql')");
  });
});

describe('lab25 azure: KQL pack matches the schema and the offline mirror', () => {
  const files = readdirSync(join(FIXTURE, 'kql')).filter((f) => f.endsWith('.kql'));
  const columnsByTable = Object.fromEntries(schema.tables.map((t: any) => [`${t.name}_CL`, t.columns.map((c: any) => c.name)]));
  const header = (text: string, key: string) => text.match(new RegExp(`^// ${key}: (.+)$`, 'm'))?.[1].trim() ?? '';

  it('has one file per query id, plus the alert', () => {
    expect(files.map((f) => f.replace('.kql', '')).sort()).toEqual([...QUERY_IDS, 'alert-cost-p95'].sort());
  });

  it.each(files)('%s header names only schema tables and columns', (file) => {
    const text = readFileSync(join(FIXTURE, 'kql', file), 'utf8');
    expect(header(text, 'id')).toBe(file.replace('.kql', ''));
    const tables = header(text, 'tables').split(',').map((s) => s.trim());
    const allowed = new Set(tables.flatMap((t) => {
      expect(columnsByTable[t], `unknown table ${t}`).toBeDefined();
      return columnsByTable[t];
    }));
    for (const col of header(text, 'columns').split(',').map((s) => s.trim())) {
      expect(allowed.has(col), `${file}: ${col}`).toBe(true);
    }
  });

  it('every cost query sums the root invoke_agent span only', () => {
    for (const f of ['cost-per-task.kql', 'alert-cost-p95.kql']) {
      const text = readFileSync(join(FIXTURE, 'kql', f), 'utf8');
      expect(text, f).toMatch(/SpanName == "invoke_agent" and isempty\(ParentSpanId\)/);
    }
  });
});
