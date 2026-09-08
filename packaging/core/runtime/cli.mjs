import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { initializeWorkspace, inspectWorkspace } from './initialize.mjs';
import { coreEnvironment } from './profile.mjs';
import { prepareUserTools, copilotArguments } from './copilot.mjs';
import { checkReadiness, restoreWorkspace } from './readiness.mjs';
import { verifyHydratedDependencies } from './catalog.mjs';

function execute(command, args, workspace, env) {
  const result = spawnSync(command, args, { cwd: workspace, env, stdio: 'inherit' });
  if (result.error) throw new Error(`Cannot execute prepared command: ${result.error.message}`, { cause: result.error });
  process.exitCode = result.status ?? 1;
}

function findWorkspace(start) {
  const current = resolve(start);
  if (existsSync(join(current, 'dotnet/ContosoUniversity.sln')) && existsSync(join(current, 'node/package.json'))) return current;
  const parent = dirname(current);
  if (parent === current) throw new Error('Run lab-core inside the lab checkout, or pass --workspace PATH');
  return findWorkspace(parent);
}

function configureRepository(workspace, env) {
  const existing = spawnSync('git', ['config', '--local', '--get', 'core.hooksPath'], {
    cwd: workspace, env, encoding: 'utf8',
  });
  if (existing.status === 0) return;
  if (existing.error || existing.status !== 1) throw new Error('Cannot read checkout-local Git hook configuration');
  const configured = spawnSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], {
    cwd: workspace, env, encoding: 'utf8',
  });
  if (configured.error || configured.status !== 0) throw new Error('Cannot initialize checkout-local Git hooks; no global configuration was changed');
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { workspace: { type: 'string', default: process.cwd() }, help: { type: 'boolean', short: 'h' } },
  });
  const [command, ...args] = positionals;
  if (values.help || !command) {
    process.stdout.write('lab-core [--workspace PATH] init|ready|shell|exec|copilot [-- COMMAND ARGS]\n');
    return;
  }
  if (!['init', 'ready', 'shell', 'exec', 'copilot'].includes(command)) throw new Error(`Unknown prepared-core command: ${command}`);
  if (process.getuid?.() === 0) throw new Error('Run prepared startup as the attendee user, not root');
  const commandDirectory = realpathSync(values.workspace);
  const workspace = realpathSync(findWorkspace(commandDirectory));
  const runtime = process.env.LAB_RUNTIME || '/opt/lab';
  const context = command === 'init' ? initializeWorkspace(workspace, runtime) : inspectWorkspace(workspace, runtime);
  verifyHydratedDependencies(workspace, runtime, context.release);
  const env = prepareUserTools(context, runtime, coreEnvironment(workspace, runtime));
  if (command === 'init') configureRepository(workspace, env);
  restoreWorkspace(context, runtime, env);
  if (command === 'init' || command === 'ready') {
    process.stdout.write(`${JSON.stringify(await checkReadiness(context, runtime, env))}\n`);
    return;
  }
  if (command === 'shell') return execute('/bin/bash', ['--noprofile', '--norc', '-i'], commandDirectory, env);
  if (command === 'copilot') return execute(join(runtime, 'tools/node_modules/.bin/copilot'), copilotArguments(context, runtime, env, args), commandDirectory, env);
  if (!args.length) throw new Error('lab-core exec requires a command after --');
  execute(args[0], args.slice(1), commandDirectory, env);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ event: 'core.failed', error: error.message })}\n`);
  process.exitCode = 1;
});
