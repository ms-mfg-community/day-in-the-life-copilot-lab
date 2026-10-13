#!/usr/bin/env node
// Lab 24 task-prompt validator. Deterministic: on failure it rejects, it never re-prompts.
//
//   node validate-tasks.mjs specs/<feature>/tasks.md [--manifest m] [--registry r]
//   node validate-tasks.mjs <tasks.md> --stamp-run <run_id>   # fill {run} placeholders, then validate
//   node validate-tasks.mjs <tasks.md> --print T014           # the prompt for `copilot -p`
//   node validate-tasks.mjs <tasks.md> --dispatch T014        # {agent, tier, model, fallback_model}
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_OWNED_FILES = 3;
const EXECUTION = ['agent', 'split', 'human'];
const LADDER = ['self-heal', 'redispatch', 'stage-owner', 'scope-change'];
const MAX_RETRY_BUDGET = 3;
const TASK_LINE = /^- \[[ xX]\] (T\d{3,})\b(.*)$/;
const RUN_ID = /^[0-9a-f]{8}$/;
const KEY = /^[0-9]{3}-[a-z0-9-]+\/[a-z-]+\/(-|T\d{3})\/[0-9a-f]{8}$/;
const REQUIRED = ['objective', 'deliverable', 'sizing', 'context', 'fresh_session', 'constraints',
  'do_not_modify', 'owned_files', 'agent', 'tier', 'fallback_tier', 'acceptance', 'execution',
  'escalation', 'correlation_key'];

async function loadYaml() {
  try {
    return (await import('js-yaml')).default;
  } catch {
    throw new Error('js-yaml is required: run `npm install --no-save js-yaml@4` first');
  }
}

// Splits tasks.md into T tasks with their fenced `yaml task-prompt` block. G tasks are ignored.
export function extractTasks(text) {
  const lines = text.split(/\r?\n/);
  const tasks = [];
  let current = null;
  let fence = null;
  lines.forEach((line, i) => {
    if (fence) {
      if (line.trim() === '```') {
        current.block = fence.body.join('\n');
        fence = null;
      } else fence.body.push(line.slice(fence.indent));
      return;
    }
    const task = line.match(TASK_LINE);
    if (task) {
      current = { id: task[1], text: task[2], line: i + 1, block: null };
      tasks.push(current);
      return;
    }
    if (/^#{1,6} /.test(line) || /^- \[[ xX]\] /.test(line)) current = null;
    const open = line.match(/^(\s*)```yaml task-prompt\s*$/);
    if (open && current) fence = { indent: open[1].length, body: [] };
  });
  return tasks;
}

const isList = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && x.trim());
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const under = (file, entry) => (entry.endsWith('/') ? file.startsWith(entry) : file === entry);

function checkPrompt(task, p, ctx) {
  const errs = [];
  const missing = REQUIRED.filter((k) => p[k] === undefined || p[k] === null);
  if (missing.length) return [`missing fields: ${missing.join(', ')}`];
  if (!isText(p.objective)) errs.push('objective must be text');
  if (!isText(p.deliverable)) errs.push('deliverable must be a single text value');
  if (p.sizing?.self_sufficient !== true) errs.push('sizing.self_sufficient must be true');
  if (!isList(p.owned_files)) errs.push('owned_files must be a non-empty list');
  else if (p.owned_files.length > MAX_OWNED_FILES) errs.push(`sizing: more than ${MAX_OWNED_FILES} owned files, split the task`);
  if (p.fresh_session !== true) errs.push('fresh_session must be true');
  if (!isList(p.constraints)) errs.push('constraints must be a non-empty list');
  if (!isList(p.do_not_modify)) errs.push('do_not_modify must be a non-empty list');
  if (!isList(p.context)) errs.push('context must be a non-empty list');
  for (const link of isList(p.context) ? p.context : []) {
    if (/^https?:\/\//.test(link)) ctx.warnings.push(`${task.id}: ${link} is not resolved (remote link)`);
    else if (!existsSync(join(ctx.root, link.split('#')[0]))) errs.push(`context link does not resolve: ${link}`);
  }
  const named = [...task.text.matchAll(/`([^`]+\/[^`]+)`/g)].map((m) => m[1]);
  const owned = isList(p.owned_files) ? p.owned_files : [];
  named.filter((f) => !owned.includes(f)).forEach((f) => errs.push(`task line names ${f} but owned_files omits it`));
  if (isList(p.do_not_modify)) {
    owned.filter((f) => p.do_not_modify.some((d) => under(f, d))).forEach((f) => errs.push(`${f} is both owned and do-not-modify`));
  }
  if (!ctx.agents.includes(p.agent)) errs.push(`agent ${p.agent} is not in the manifest (${ctx.agents.join(', ')})`);
  if (!ctx.tiers.includes(p.tier)) errs.push(`tier ${p.tier} is not a registry tier (${ctx.tiers.join(', ')})`);
  if (!ctx.tiers.includes(p.fallback_tier)) errs.push(`fallback_tier ${p.fallback_tier} is not a registry tier`);
  if (p.tier === p.fallback_tier) errs.push('fallback_tier must differ from tier');
  if (!isText(p.acceptance?.command) || !isText(p.acceptance?.expect)) errs.push('acceptance needs a command and an expect');
  if (!EXECUTION.includes(p.execution)) errs.push(`execution must be one of ${EXECUTION.join(' | ')}`);
  if (p.execution !== 'agent' && !(isText(p.override?.by) && isText(p.override?.reason))) {
    errs.push(`execution ${p.execution} needs override.by and override.reason`);
  }
  const e = p.escalation;
  if (!isList(e.ladder) || e.ladder.some((s) => !LADDER.includes(s))) errs.push(`escalation.ladder steps must be from ${LADDER.join(', ')}`);
  if (!Number.isInteger(e.retry_budget) || e.retry_budget < 0 || e.retry_budget > MAX_RETRY_BUDGET) {
    errs.push(`escalation.retry_budget must be an integer 0-${MAX_RETRY_BUDGET}`);
  }
  if (!isText(e.stop_rule)) errs.push('escalation.stop_rule must be text');
  const [feature, stage, id, run, extra] = String(p.correlation_key).split('/');
  if (extra !== undefined || feature !== ctx.feature || !['implement', 'rework'].includes(stage) || id !== task.id) {
    errs.push(`correlation_key must be ${ctx.feature}/implement|rework/${task.id}/<run>`);
  } else if (run === '{run}') errs.push('correlation_key run is not stamped (run with --stamp-run)');
  else if (!KEY.test(p.correlation_key)) errs.push('correlation_key does not match the Lab 25 key contract');
  if (p.supersedes !== undefined && (p.supersedes === task.id || !ctx.ids.includes(p.supersedes))) {
    errs.push(`supersedes ${p.supersedes} must name another task in this file`);
  }
  return errs;
}

export function loadContext(tasksPath, manifestPath, registryPath, yaml) {
  const abs = resolve(tasksPath);
  const featureDir = dirname(abs);
  if (basename(abs) !== 'tasks.md' || basename(dirname(featureDir)) !== 'specs') {
    throw new Error(`${tasksPath} must live at specs/<feature>/tasks.md`);
  }
  const manifest = yaml.load(readFileSync(manifestPath, 'utf8'));
  const registry = yaml.load(readFileSync(registryPath, 'utf8'));
  return {
    root: dirname(dirname(featureDir)),
    feature: basename(featureDir),
    agents: (manifest?.entrypoints?.agents ?? []).map((a) => basename(a, '.md')),
    tiers: Object.keys(registry?.models ?? {}).filter((k) => k !== 'default'),
    models: registry?.models ?? {},
    warnings: [],
  };
}

export function validate(text, ctx, yaml) {
  const tasks = extractTasks(text);
  const errors = [];
  const ids = tasks.map((t) => t.id);
  ids.filter((id, i) => ids.indexOf(id) !== i).forEach((id) => errors.push(`${id}: duplicate task id`));
  if (tasks.length === 0) errors.push('no T tasks found');
  for (const task of tasks) {
    if (!task.block) {
      errors.push(`line ${task.line} ${task.id}: no yaml task-prompt block`);
      continue;
    }
    let prompt;
    try {
      prompt = yaml.load(task.block);
    } catch (err) {
      errors.push(`line ${task.line} ${task.id}: invalid YAML (${err.reason ?? err.message})`);
      continue;
    }
    checkPrompt(task, prompt ?? {}, { ...ctx, ids }).forEach((e) => errors.push(`line ${task.line} ${task.id}: ${e}`));
  }
  return { tasks, errors, warnings: ctx.warnings };
}

export function renderPrompt(p) {
  const list = (xs) => xs.map((x) => `- ${x}`).join('\n');
  return [
    p.objective,
    `Deliverable: ${p.deliverable}`,
    `Read these first:\n${list(p.context)}`,
    `Constraints:\n${list(p.constraints)}`,
    `Do not modify:\n${list(p.do_not_modify)}`,
    `You own only:\n${list(p.owned_files)}`,
    `Done when \`${p.acceptance.command}\` gives: ${p.acceptance.expect}`,
    `If blocked: ${p.escalation.ladder.join(' -> ')}. Retry budget ${p.escalation.retry_budget}. ${p.escalation.stop_rule}`,
    `Correlation key: ${p.correlation_key}`,
  ].join('\n\n');
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const tasksPath = process.argv[2];
  if (!tasksPath || tasksPath.startsWith('--')) throw new Error('usage: validate-tasks.mjs specs/<feature>/tasks.md');
  const yaml = await loadYaml();
  const ctx = loadContext(
    tasksPath,
    arg('--manifest') ?? 'enterprise-harness-bundle/manifest.yaml',
    arg('--registry') ?? 'docs/_meta/registry.yaml',
    yaml,
  );
  let text = readFileSync(tasksPath, 'utf8');
  const run = arg('--stamp-run');
  if (run) {
    if (!RUN_ID.test(run)) throw new Error(`--stamp-run ${run} is not a Spec Kit run id`);
    text = text.replace(/(correlation_key:\s*\S+\/)\{run\}/g, `$1${run}`);
    writeFileSync(tasksPath, text);
  }
  const { tasks, errors, warnings } = validate(text, ctx, yaml);
  warnings.forEach((w) => process.stderr.write(`warning: ${w}\n`));
  if (errors.length) {
    errors.forEach((e) => process.stderr.write(`${tasksPath}: ${e}\n`));
    process.exitCode = 1;
    return;
  }
  const pick = arg('--print') ?? arg('--dispatch');
  if (!pick) {
    process.stdout.write(`${tasksPath}: ${tasks.length} task prompts valid\n`);
    return;
  }
  const task = tasks.find((t) => t.id === pick);
  if (!task) throw new Error(`no task ${pick}`);
  const p = yaml.load(task.block);
  if (arg('--print')) {
    process.stdout.write(`${renderPrompt(p)}\n`);
    return;
  }
  if (p.execution === 'human') throw new Error(`${pick} is execution: human (${p.override.by}); it is not dispatched`);
  const dispatch = { agent: p.agent, tier: p.tier, model: ctx.models[p.tier][0], fallback_model: ctx.models[p.fallback_tier][0], execution: p.execution };
  process.stdout.write(`${JSON.stringify(dispatch)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    process.stderr.write(`validate-tasks.mjs: ${err.message}\n`);
    process.exitCode = 1;
  });
}
