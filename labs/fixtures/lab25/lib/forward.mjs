// Lab 25 — forward rows to Azure Monitor through the Logs Ingestion API.
//
// NOT the HTTP Data Collector API: support for that ended 2026-09-14, so any snippet using
// ods.opinsights.azure.com or `Authorization: SharedKey` is obsolete.
import { SCHEMA } from './ingest.mjs';

// Data-plane version; tests/lab25 asserts it equals registry azure_monitor.logs_ingestion_data_plane_api_version.
export const LOGS_INGESTION_API_VERSION = '2023-01-01';
// Logs Ingestion API limits. The service silently truncates a field over 64 KB, so the
// forwarder refuses the batch instead of shipping a quietly corrupted row.
export const MAX_CALL_BYTES = 1_000_000;
export const MAX_FIELD_BYTES = 64 * 1024;
// Azure Monitor replaces a TimeGenerated more than two days before receipt with the receipt
// time. Keep a margin so a slow run does not cross the line mid-upload.
export const MAX_AGE_MS = 46 * 3600 * 1000;
const RESTAMP_SPAN_MS = 40 * 3600 * 1000;
const RESTAMP_END_OFFSET_MS = 3600 * 1000;
const TIME_COLUMNS = ['TimeGenerated'];

const bytes = (v) => Buffer.byteLength(typeof v === 'string' ? v : JSON.stringify(v), 'utf8');

// The URL names the streamDeclarations KEY (Custom-<Table>), never the outputStream (Custom-<Table>_CL).
export const streamName = (table) => `Custom-${table}`;

export function ingestionUrl(endpoint, immutableId, table) {
  return `${endpoint.replace(/\/$/, '')}/dataCollectionRules/${immutableId}/streams/${streamName(table)}?api-version=${LOGS_INGESTION_API_VERSION}`;
}

export function assertRowsMatchSchema(table, rows) {
  const def = SCHEMA.tables.find((t) => t.name === table);
  if (!def) throw new Error(`No table "${table}" in schema.json`);
  const columns = def.columns.map((c) => c.name);
  rows.forEach((row, i) => {
    const extra = Object.keys(row).filter((k) => !columns.includes(k));
    const missing = columns.filter((c) => !(c in row));
    if (extra.length || missing.length) {
      throw new Error(`${table} row ${i}: columns differ from schema.json (extra: ${extra.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'})`);
    }
    Object.entries(row).forEach(([col, v]) => {
      if (bytes(v) > MAX_FIELD_BYTES) {
        throw new Error(`${table} row ${i} column ${col} is ${bytes(v)} bytes; the Logs Ingestion API would silently truncate it at ${MAX_FIELD_BYTES}`);
      }
    });
  });
}

// Greedy batching on serialized UTF-8 size — row COUNT limits (a collector's batch size) do not
// bound bytes.
// ghcp-was-here: copies the batch per row (O(n^2)); fine for lab-sized files, use a mutable
// accumulator before pointing this at production volumes.
export function batchRows(rows, maxBytes = MAX_CALL_BYTES) {
  return rows.reduce((batches, row) => {
    const rowBytes = bytes(row) + 1;
    if (rowBytes + 2 > maxBytes) throw new Error(`A single row is ${rowBytes} bytes, over the ${maxBytes}-byte call limit`);
    const last = batches[batches.length - 1];
    if (last && last.bytes + rowBytes <= maxBytes) {
      return [...batches.slice(0, -1), { rows: [...last.rows, row], bytes: last.bytes + rowBytes }];
    }
    return [...batches, { rows: [row], bytes: 2 + rowBytes }];
  }, []);
}

export function planForward(dataset) {
  return Object.entries(dataset).map(([table, rows]) => {
    assertRowsMatchSchema(table, rows);
    return { table, stream: streamName(table), rows: rows.length, batches: batchRows(rows) };
  });
}

export function assertFresh(dataset, now = Date.now()) {
  const stale = Object.entries(dataset).flatMap(([table, rows]) => rows
    .filter((r) => now - Date.parse(r.TimeGenerated) > MAX_AGE_MS).map(() => table));
  if (stale.length) {
    throw new Error(`${stale.length} row(s) are more than ${MAX_AGE_MS / 3600000} h old (first table: ${stale[0]}). Azure Monitor would replace their TimeGenerated with the receipt time and collapse every window. Forward live telemetry, or pass --restamp to compress the fixture timeline into the last ${RESTAMP_SPAN_MS / 3600000} h.`);
  }
}

// Linearly maps the dataset's whole time range onto [now - 41h, now - 1h], preserving order
// and proportions. Rates and costs are unchanged; durations shrink by `scale`, and the change
// point moves, so the caller must use the returned changeAt in the KQL.
export function restamp(dataset, changeAt, now = Date.now()) {
  const times = Object.values(dataset).flat().map((r) => Date.parse(r.TimeGenerated));
  const min = Math.min(...times);
  const max = Math.max(...times);
  const end = now - RESTAMP_END_OFFSET_MS;
  const scale = max === min ? 1 : Math.min(1, RESTAMP_SPAN_MS / (max - min));
  const map = (ms) => new Date(end - (max - ms) * scale).toISOString();
  const restamped = Object.fromEntries(Object.entries(dataset).map(([table, rows]) => [
    table,
    rows.map((r) => ({ ...r, ...Object.fromEntries(TIME_COLUMNS.map((c) => [c, map(Date.parse(r[c]))])) })),
  ]));
  return { dataset: restamped, changeAt: map(Date.parse(changeAt)), scale };
}

export async function postBatches(plan, { endpoint, immutableId, token, fetchImpl = fetch }) {
  const results = [];
  for (const { table, batches } of plan) {
    for (const [i, batch] of batches.entries()) {
      const res = await fetchImpl(ingestionUrl(endpoint, immutableId, table), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(batch.rows),
      });
      if (res.status !== 204) {
        throw new Error(`${table} batch ${i + 1}/${batches.length}: HTTP ${res.status} ${await res.text()}`);
      }
      results.push({ table, batch: i + 1, rows: batch.rows.length });
    }
  }
  return results;
}
