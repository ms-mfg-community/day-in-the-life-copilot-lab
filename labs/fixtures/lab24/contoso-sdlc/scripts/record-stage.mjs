#!/usr/bin/env node
// Lab 24 stage signal. Appends one event to stage-events/<feature>.jsonl when a stage's
// artifact is ready. Committing and pushing that line is what triggers the funnel.
//
//   node record-stage.mjs --feature 001-enrollment-cap --stage plan --run 3f9a2c1e \
//     --artifact specs/001-enrollment-cap/plan.md [--from feature-spec] [--task T014]
//     [--transition rework --classification implementation] [--issue 101 | --pr 42 | --pr auto]
//     [--check-feature-json] [--require-artifact] [--dir stage-events]
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STAGES = ['epic', 'feature-spec', 'plan', 'story-tasks', 'implement', 'qa-review', 'rework'];
const CLASSIFICATIONS = ['implementation', 'spec-scope'];
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const FEATURE = /^\d{3,}-[a-z0-9][a-z0-9-]*$/;
const TASK = /^(-|T\d{3,})$/;

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function currentPr() {
  try {
    const out = execFileSync('gh', ['pr', 'view', '--json', 'number'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(out).number ?? null;
  } catch {
    return null;
  }
}

// 0 or an empty value means `no target`, so the workflow can default to 0.
const toNumber = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));

export function buildEvent(o) {
  if (!FEATURE.test(o.feature ?? '')) throw new Error('--feature must be a Spec Kit feature directory such as 001-enrollment-cap');
  if (!STAGES.includes(o.stage)) throw new Error(`--stage must be one of ${STAGES.join(', ')}`);
  if (o.from !== undefined && !STAGES.includes(o.from)) throw new Error(`--from must be one of ${STAGES.join(', ')}`);
  if (!RUN_ID.test(o.run ?? '')) throw new Error('--run must be the Spec Kit run id');
  if (o.task !== undefined && !TASK.test(o.task)) throw new Error('--task must be a tasks.md ID such as T014');
  const transition = o.transition ?? 'advance';
  if (!['advance', 'rework'].includes(transition)) throw new Error('--transition must be advance or rework');
  if (transition === 'rework' && !CLASSIFICATIONS.includes(o.classification)) {
    throw new Error(`a rework event needs --classification ${CLASSIFICATIONS.join(' | ')}`);
  }
  const task = o.task ?? '-';
  const event = {
    correlation_key: `${o.feature}/${o.stage}/${task}/${o.run}`,
    feature: o.feature,
    stage: o.stage,
    task,
    run_id: o.run,
    from_stage: o.from ?? null,
    transition,
    ...(transition === 'rework' ? { classification: o.classification } : {}),
    actor: o.actor,
    at: o.at ?? new Date().toISOString(),
    artifact: o.artifact ?? null,
    artifact_sha: o.artifactSha ?? null,
  };
  const issue = toNumber(o.issue);
  const pr = toNumber(o.pr);
  if (Number.isInteger(issue) && issue > 0) event.issue = issue;
  if (Number.isInteger(pr) && pr > 0) event.pr = pr;
  return event;
}

// Spec Kit numbers the feature itself; fail loudly if it picked a different directory.
export function checkFeatureJson(feature, path = '.specify/feature.json') {
  if (!existsSync(path)) throw new Error(`${path} not found; run specify first`);
  const dir = JSON.parse(readFileSync(path, 'utf8')).feature_directory ?? '';
  if (basename(dir) !== feature) {
    throw new Error(`Spec Kit created ${basename(dir)}, not ${feature}; re-run with --input feature=${basename(dir)}`);
  }
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function main() {
  const feature = arg('--feature');
  if (!FEATURE.test(feature ?? '')) throw new Error('--feature must be a Spec Kit feature directory such as 001-enrollment-cap');
  if (process.argv.includes('--check-feature-json')) checkFeatureJson(feature);
  const artifact = arg('--artifact');
  if (process.argv.includes('--require-artifact') && !(artifact && existsSync(artifact))) {
    throw new Error(`artifact ${artifact} does not exist; the stage did not produce it`);
  }
  const artifactSha = artifact && existsSync(artifact) ? git(['hash-object', artifact]) : null;
  const pr = arg('--pr') === 'auto' ? currentPr() : arg('--pr');
  const event = buildEvent({
    feature,
    stage: arg('--stage'),
    task: arg('--task'),
    run: arg('--run'),
    from: arg('--from'),
    transition: arg('--transition'),
    classification: arg('--classification'),
    actor: arg('--actor') ?? process.env.GITHUB_ACTOR ?? git(['config', 'user.name']) ?? 'unknown',
    artifact: artifact ?? null,
    artifactSha,
    issue: arg('--issue'),
    pr: pr ?? undefined,
  });
  const dir = arg('--dir') ?? 'stage-events';
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${feature}.jsonl`);
  appendFileSync(file, `${JSON.stringify(event)}\n`);
  process.stdout.write(`${file}: ${event.correlation_key}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`record-stage.mjs: ${err.message}\n`);
    process.exitCode = 1;
  }
}
