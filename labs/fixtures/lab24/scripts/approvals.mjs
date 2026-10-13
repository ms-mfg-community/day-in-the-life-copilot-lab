#!/usr/bin/env node
// Lab 24 approvals of record. Spec Kit gates record no approver, so the approval of
// record is a marker in a PR review or comment, made by the gate owner.
//
//   node approvals.mjs --record --gate review-plan --key 001-enrollment-cap/plan/-/3f9a2c1e \
//     --verdict approve --approver blake-lead --artifact specs/001-enrollment-cap/plan.md
//   node approvals.mjs --count <comments-and-reviews.json> [--roles roles.json] [--out approvals-of-record.json]
//
// --count reads raw GitHub API objects: {"comments": [issue comments], "reviews": [PR reviews]}.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MARKER = /<!--\s*contoso-approval\s+(\{[\s\S]*?\})\s*-->/g;
const GATE_STAGE = {
  'review-epic': 'epic',
  'review-spec': 'feature-spec',
  'review-plan': 'plan',
  'review-tasks': 'story-tasks',
  'review-qa': 'qa-review',
};
const REVIEW_VERDICT = { APPROVED: 'approve', CHANGES_REQUESTED: 'reject' };
const SHA = /^[0-9a-f]{40}$/;
const KEY = /^[0-9]{3}-[a-z0-9-]+\/[a-z-]+\/(-|T\d{3})\/[0-9a-f]{8}$/;

export function marker(record) {
  return `<!-- contoso-approval ${JSON.stringify(record)} -->`;
}

function problem(rec, author, gates, review) {
  if (!KEY.test(rec.correlation_key ?? '')) return 'correlation_key does not match the Lab 25 key contract';
  const [feature, stage, task, run, extra] = String(rec.correlation_key).split('/');
  if (!GATE_STAGE[rec.gate]) return `unknown gate ${rec.gate}`;
  if (!feature || stage !== GATE_STAGE[rec.gate] || task !== '-' || extra !== undefined) {
    return `correlation_key must be <feature>/${GATE_STAGE[rec.gate]}/-/<run> for ${rec.gate}`;
  }
  if (run !== rec.run_id) return `run_id ${rec.run_id} does not match the key`;
  if (!['approve', 'reject'].includes(rec.verdict)) return `verdict ${rec.verdict} is not approve|reject`;
  if (rec.approver !== author) return `approver ${rec.approver} is not the author ${author}`;
  if (gates[rec.gate] !== author) return `${author} does not own ${rec.gate} (owner ${gates[rec.gate]})`;
  if (rec.artifact_sha !== null && !SHA.test(String(rec.artifact_sha))) return 'artifact_sha is not a git blob SHA';
  if (review && REVIEW_VERDICT[review.state] !== rec.verdict) return `review state ${review.state} contradicts ${rec.verdict}`;
  if (rec.escalated_to !== undefined && !/^@[\w-]+$/.test(String(rec.escalated_to))) return 'escalated_to must be @owner';
  return null;
}

function collect(body, author, at, source, gates, review) {
  return [...String(body ?? '').matchAll(MARKER)].map((m) => {
    let rec;
    try {
      rec = JSON.parse(m[1]);
    } catch {
      return { invalid: { author, reason: 'marker is not JSON' } };
    }
    const reason = problem(rec, author, gates, review);
    if (reason) return { invalid: { author, correlation_key: rec.correlation_key ?? null, reason } };
    const { correlation_key, gate, run_id, verdict, approver, artifact_sha, escalated_to } = rec;
    // The platform's author and timestamp win over anything claimed in the marker.
    const record = { correlation_key, gate, run_id, verdict, approver, artifact_sha, source, at };
    return { record: escalated_to ? { ...record, escalated_to } : record };
  });
}

export function count(input, roles) {
  const found = [
    ...(input.comments ?? []).flatMap((c) => collect(c.body, c.user?.login, c.created_at, 'comment', roles.gates)),
    ...(input.reviews ?? []).flatMap((r) => collect(r.body, r.user?.login, r.submitted_at, 'pr-review', roles.gates, r)),
  ];
  const valid = found.filter((f) => f.record).map((f) => f.record).sort((a, b) => a.at.localeCompare(b.at));
  // The same decision posted twice (a repeated review or marker) is one record, the earliest.
  const seen = new Set();
  const records = valid.filter((r) => {
    const id = [r.correlation_key, r.gate, r.verdict, r.approver, r.artifact_sha].join('|');
    return seen.has(id) ? false : seen.add(id);
  });
  const qaRejects = records.filter((r) => r.gate === 'review-qa' && r.verdict === 'reject').length;
  return {
    records,
    invalid: found.filter((f) => f.invalid).map((f) => f.invalid),
    counts: {
      approve: records.filter((r) => r.verdict === 'approve').length,
      reject: records.filter((r) => r.verdict === 'reject').length,
      escalated: records.filter((r) => r.escalated_to).length,
    },
    rework_rounds: qaRejects,
    max_rework_rounds: roles.max_rework_rounds,
    round_cap_reached: qaRejects >= roles.max_rework_rounds,
  };
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function blobSha(path) {
  if (!path || !existsSync(path)) return null;
  return execFileSync('git', ['hash-object', path], { encoding: 'utf8' }).trim();
}

function main() {
  const roles = JSON.parse(readFileSync(arg('--roles') ?? join(HERE, '..', 'roles.json'), 'utf8'));
  if (process.argv.includes('--record')) {
    const key = arg('--key') ?? '';
    const rec = {
      correlation_key: key,
      gate: arg('--gate'),
      run_id: key.split('/')[3],
      verdict: arg('--verdict'),
      approver: arg('--approver'),
      artifact_sha: blobSha(arg('--artifact')),
      ...(arg('--escalate') ? { escalated_to: arg('--escalate') } : {}),
    };
    const reason = problem(rec, rec.approver, roles.gates);
    if (reason) throw new Error(reason);
    process.stdout.write(`${marker(rec)}\n`);
    return;
  }
  const file = arg('--count');
  if (!file) throw new Error('usage: approvals.mjs --record ... | --count <comments-and-reviews.json>');
  const result = count(JSON.parse(readFileSync(file, 'utf8')), roles);
  const out = arg('--out');
  if (out) {
    const { records, ...summary } = result;
    writeFileSync(out, `${JSON.stringify(records, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`approvals.mjs: ${err.message}\n`);
    process.exitCode = 1;
  }
}
