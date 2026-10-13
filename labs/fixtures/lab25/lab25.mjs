#!/usr/bin/env node
// Lab 25 CLI — the offline path. No Azure subscription, no npm install, Node >= 18.
//
//   node labs/fixtures/lab25/lab25.mjs report [--json] [--data DIR] [--change-at ISO]
//   node labs/fixtures/lab25/lab25.mjs query <id> [--data DIR] [--change-at ISO]
//   node labs/fixtures/lab25/lab25.mjs provenance <feature> [--data DIR]
//   node labs/fixtures/lab25/lab25.mjs inspect <copilot-otel.jsonl>
//   node labs/fixtures/lab25/lab25.mjs forward [--dry-run] [--restamp] [--data DIR]
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDataset, parseSpans, spanToRow } from './lib/ingest.mjs';
import { RUNNERS, DEFAULT_CHANGE_AT, isRoot, NANO_PER_AIU } from './lib/queries.mjs';
import { buildFindings, renderFindings, verifiedProvenance, table } from './lib/report.mjs';
import { planForward, postBatches, assertFresh, restamp } from './lib/forward.mjs';

const DEFAULT_DATA = join(dirname(fileURLToPath(import.meta.url)), 'data');
const USAGE = 'usage: lab25.mjs report|query <id>|provenance <feature>|inspect <file>|forward [--dry-run] [--restamp] [--json] [--data DIR] [--change-at ISO]';

function parseArgs(argv) {
  const flags = { json: false, dryRun: false, restamp: false, data: DEFAULT_DATA, changeAt: DEFAULT_CHANGE_AT };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') flags.json = true;
    else if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--restamp') flags.restamp = true;
    else if (a === '--data') flags.data = resolve(argv[(i += 1)]);
    else if (a === '--change-at') flags.changeAt = argv[(i += 1)];
    else positional.push(a);
  }
  if (Number.isNaN(Date.parse(flags.changeAt))) throw new Error(`--change-at "${flags.changeAt}" is not an ISO date`);
  return { command: positional[0], arg: positional[1], flags };
}

const out = (text) => process.stdout.write(`${text}\n`);

function inspect(file) {
  const rows = parseSpans(readFileSync(file, 'utf8')).map(spanToRow);
  const roots = rows.filter(isRoot);
  const rootAiu = roots.reduce((a, r) => a + r.NanoAiu, 0) / NANO_PER_AIU;
  const allAiu = rows.reduce((a, r) => a + r.NanoAiu, 0) / NANO_PER_AIU;
  out(table(rows.map((r) => ({ SpanName: r.SpanName, Kind: r.SpanKind, Root: isRoot(r) ? 'yes' : '', ParentSpanId: r.ParentSpanId || '—', NanoAiu: r.NanoAiu, CorrelationKey: r.CorrelationKey || '—', BundleVersion: r.BundleVersion || '—' }))));
  out(`\nRoot-only AIU: ${rootAiu}   Summing every span: ${allAiu}${roots.length && allAiu > rootAiu ? '  <- the double count' : ''}`);
  if (!rows.some((r) => r.CorrelationKey)) out('No contoso.correlation_key on the resource: set OTEL_RESOURCE_ATTRIBUTES before starting the session.');
}

async function forward(flags) {
  const loaded = loadDataset(flags.data);
  let dataset = loaded;
  if (flags.restamp) {
    const r = restamp(loaded, flags.changeAt);
    dataset = r.dataset;
    out(`Restamped into the last 41 h. Use changeAt = datetime(${r.changeAt}) in the KQL; durations are scaled by ${r.scale.toPrecision(3)}.`);
  } else if (!flags.dryRun) {
    assertFresh(loaded);
  }
  const plan = planForward(dataset);
  out(table(plan.map((p) => ({ Table: p.table, Stream: p.stream, Rows: p.rows, Batches: p.batches.length, LargestBatchBytes: Math.max(0, ...p.batches.map((b) => b.bytes)) }))));
  if (flags.dryRun) return;
  const { LAB25_DCE_ENDPOINT: endpoint, LAB25_DCR_IMMUTABLE_ID: immutableId, LAB25_MONITOR_TOKEN: token } = process.env;
  if (!endpoint || !immutableId || !token) {
    throw new Error('Set LAB25_DCE_ENDPOINT and LAB25_DCR_IMMUTABLE_ID (Bicep outputs) and LAB25_MONITOR_TOKEN (az account get-access-token --resource https://monitor.azure.com --query accessToken -o tsv), or pass --dry-run');
  }
  const sent = await postBatches(plan, { endpoint, immutableId, token });
  out(`Sent ${sent.length} batch(es). Rows can take several minutes to appear in the workspace.`);
}

async function main() {
  const { command, arg, flags } = parseArgs(process.argv.slice(2));
  if (command === 'inspect') {
    if (!arg) throw new Error('inspect needs a file: the path you set in COPILOT_OTEL_FILE_EXPORTER_PATH');
    return inspect(arg);
  }
  if (command === 'forward') return forward(flags);
  const data = loadDataset(flags.data);
  if (command === 'report') {
    const findings = buildFindings(data, { changeAt: flags.changeAt });
    return out(flags.json ? JSON.stringify(findings, null, 2) : renderFindings(findings));
  }
  if (command === 'query') {
    const run = RUNNERS[arg];
    if (!run) throw new Error(`Unknown query "${arg}". Known: ${Object.keys(RUNNERS).join(', ')}, provenance`);
    const rows = run(data, { changeAt: flags.changeAt });
    return out(flags.json ? JSON.stringify(rows, null, 2) : table(rows));
  }
  if (command === 'provenance') {
    if (!arg) throw new Error('provenance needs a feature, e.g. 001-enrollment-cap');
    const rows = verifiedProvenance(data, arg, flags.data);
    if (rows.length === 0) throw new Error(`No stage events, approvals or sessions for feature "${arg}"`);
    return out(flags.json ? JSON.stringify(rows, null, 2) : table(rows.map((r) => ({ ...r, ArtifactSha: r.ArtifactSha ? r.ArtifactSha.slice(0, 10) : '' }))));
  }
  throw new Error(USAGE);
}

main().catch((err) => {
  process.stderr.write(`lab25: ${err.message}\n`);
  process.exitCode = 1;
});
