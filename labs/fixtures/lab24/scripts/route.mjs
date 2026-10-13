#!/usr/bin/env node
// Lab 24 deterministic router. Stage event + role table + CODEOWNERS -> route.
// Zero dependencies so it runs on a bare Actions runner.
//
//   node route.mjs --events <file|dir> [--out route.json]
//   node route.mjs --events <file|dir> --check <agent_output.json>
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROLES_PATH = join(HERE, '..', 'roles.json');
const CODEOWNERS_PATH = join(HERE, '..', 'CODEOWNERS');
const INFO_TYPES = new Set(['noop', 'missing_tool', 'missing_data', 'report_incomplete']);

export function readEvents(path) {
  const files = statSync(path).isDirectory()
    ? readdirSync(path).filter((f) => f.endsWith('.jsonl')).sort().map((f) => join(path, f))
    : [path];
  return files.flatMap((file) =>
    readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line, i) => {
      if (!line.trim()) return [];
      try {
        return [JSON.parse(line)];
      } catch (err) {
        throw new Error(`${file}:${i + 1} is not valid JSON: ${err.message}`);
      }
    }),
  );
}

// ghcp-was-here: on push we route the newest event across all files. Two features
// pushed in the same second would notify only one; upgrade path is diffing
// github.event.before..github.sha and routing every new line.
export function latestEvent(events) {
  if (events.length === 0) throw new Error('no stage events found');
  return events.reduce((a, b) => (Date.parse(b.at) >= Date.parse(a.at) ? b : a));
}

function patternToRegex(pattern) {
  const anchored = pattern.startsWith('/');
  let body = pattern.replace(/^\//, '');
  const dirOnly = body.endsWith('/');
  if (dirOnly) body = body.slice(0, -1);
  const escape = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const glob = body
    .split('**')
    .map((part) => part.split('*').map(escape).join('[^/]*'))
    .join('.*');
  const prefix = anchored || body.includes('/') ? '^' : '^(?:.*/)?';
  return new RegExp(`${prefix}${glob}${dirOnly ? '/.*' : '(?:/.*)?'}$`);
}

// GitHub semantics: the last matching rule wins.
export function codeownersFor(path, text) {
  const rules = text
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean)
    .map((l) => l.split(/\s+/));
  const match = rules.filter(([p]) => patternToRegex(p).test(path)).pop();
  return match ? match.slice(1) : [];
}

export function route(event, roles, codeownersText) {
  const rework = event.transition === 'rework';
  const entry = rework ? roles.rework[event.classification] : roles.stages[event.stage];
  if (!entry) {
    throw new Error(`no route for stage=${event.stage} classification=${event.classification}`);
  }
  const target = event.pr
    ? { kind: 'pr', number: event.pr }
    : event.issue
      ? { kind: 'issue', number: event.issue }
      : null;
  const owners = target?.kind === 'pr' && event.artifact ? codeownersFor(event.artifact, codeownersText) : [];
  // GitHub refuses a review request to the author, so the actor is never a reviewer.
  const handles = owners.map((o) => o.replace(/^@/, '')).filter((h) => h !== event.actor);
  return {
    correlation_key: event.correlation_key,
    stage: event.stage,
    transition: event.transition,
    classification: rework ? event.classification : null,
    artifact: event.artifact ?? null,
    next: entry.next,
    notify: entry.notify,
    surface: entry.surface,
    project_status: entry.project_status,
    escalated_to: rework && event.classification === 'spec-scope' ? `@${entry.notify}` : null,
    target,
    assignees: target ? [entry.notify] : [],
    reviewers: handles.filter((h) => !h.includes('/')),
    team_reviewers: handles.filter((h) => h.includes('/')).map((h) => h.split('/')[1]),
  };
}

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// The writes the route requires, exactly once each. Anything else is rejected.
export function expectedTypes(r) {
  if (!r.target) return ['noop'];
  const hasReviewers = r.target.kind === 'pr' && (r.reviewers.length > 0 || r.team_reviewers.length > 0);
  return ['assign_to_user', 'update_project', 'add_comment', ...(hasReviewers ? ['add_reviewer'] : [])];
}

function checkItem(item, r) {
  const type = String(item.type).replace(/-/g, '_');
  if (!r.target) return type === 'noop' ? null : `${type}: route has no target, only noop is allowed`;
  if (INFO_TYPES.has(type)) return `${type}: route has a target, so the writes are required`;
  const n = r.target.number;
  if (type === 'assign_to_user') {
    const who = [item.assignee, ...(item.assignees ?? [])].filter(Boolean);
    if (Number(item.issue_number) !== n) return `assign_to_user: issue_number ${item.issue_number} != ${n}`;
    return sameSet(who, r.assignees) ? null : `assign_to_user: ${who} != ${r.assignees}`;
  }
  if (type === 'add_reviewer') {
    if (r.target.kind !== 'pr') return 'add_reviewer: target is not a pull request';
    if (Number(item.pull_request_number) !== n) return `add_reviewer: pull_request_number != ${n}`;
    const ok = sameSet(item.reviewers ?? [], r.reviewers) && sameSet(item.team_reviewers ?? [], r.team_reviewers);
    return ok ? null : 'add_reviewer: reviewers differ from the CODEOWNERS route';
  }
  if (type === 'update_project') {
    const status = item.fields?.Status ?? item.fields?.status;
    if (Number(item.content_number) !== n) return `update_project: content_number != ${n}`;
    return status === r.project_status ? null : `update_project: status ${status} != ${r.project_status}`;
  }
  if (type === 'add_comment') {
    const num = Number(item.item_number ?? item.pr_number ?? item.pr);
    if (num !== n) return `add_comment: item_number ${num} != ${n}`;
    const keyLine = `correlation_key: ${r.correlation_key}`;
    if (!String(item.body).includes(keyLine)) return 'add_comment: body lacks the correlation key line';
    const allowed = [r.notify, r.escalated_to?.replace(/^@/, '')].filter(Boolean);
    const stray = [...String(item.body).matchAll(/@([\w-]+(?:\/[\w-]+)?)/g)].map((m) => m[1]).filter((h) => !allowed.includes(h));
    return stray.length ? `add_comment: mentions ${stray.join(', ')}, who are not routed` : null;
  }
  return `${type}: not a funnel output`;
}

export function check(r, agentOutput) {
  const items = agentOutput.items ?? [];
  const types = items.map((item) => String(item.type).replace(/-/g, '_'));
  const counts = expectedTypes(r).flatMap((t) => {
    const n = types.filter((x) => x === t).length;
    return n === 1 ? [] : [`${t}: expected exactly 1, got ${n}`];
  });
  return [...counts, ...items.map((item) => checkItem(item, r)).filter(Boolean)];
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function main() {
  const events = arg('--events');
  if (!events) throw new Error('usage: route.mjs --events <file|dir> [--out f | --check agent_output.json]');
  const roles = JSON.parse(readFileSync(arg('--roles') ?? ROLES_PATH, 'utf8'));
  const owners = readFileSync(arg('--codeowners') ?? CODEOWNERS_PATH, 'utf8');
  const r = route(latestEvent(readEvents(events)), roles, owners);
  const checkPath = arg('--check');
  if (checkPath) {
    const errors = check(r, JSON.parse(readFileSync(checkPath, 'utf8')));
    errors.forEach((e) => process.stderr.write(`route mismatch: ${e}\n`));
    process.exitCode = errors.length ? 1 : 0;
    return;
  }
  const json = `${JSON.stringify(r, null, 2)}\n`;
  if (arg('--out')) writeFileSync(arg('--out'), json);
  else process.stdout.write(json);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`route.mjs: ${err.message}\n`);
    process.exitCode = 1;
  }
}
