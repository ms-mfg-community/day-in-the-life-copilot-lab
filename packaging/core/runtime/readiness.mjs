import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readJson, writeJson } from './io.mjs';
import { probeLsp, probeMcp } from '../verify/protocols.mjs';

export function run(command, args, workspace, env) {
  try {
    return execFileSync(command, args, { cwd: workspace, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`Prepared tool failed: ${command}\n${error.stderr?.toString() ?? error.message}`, { cause: error });
  }
}

export function restoreWorkspace(context, runtime, env) {
  const { workspace, release } = context;
  const projects = Object.keys(release.inputs).filter((path) => path.endsWith('.csproj'));
  const marker = join(workspace, '.lab-state/restore.json');
  const previous = existsSync(marker) ? readJson(marker) : undefined;
  const missing = projects.some((project) => !existsSync(join(workspace, dirname(project), 'obj/project.assets.json')));
  if (previous?.workspace === workspace && previous.releaseId === release.releaseId && !missing) return;
  run('dotnet', [
    'restore', 'dotnet/ContosoUniversity.sln', '--locked-mode', '--force',
    '--configfile', join(runtime, 'NuGet.Config'), '--packages', env.NUGET_PACKAGES, '-p:NuGetAudit=false',
  ], workspace, env);
  writeJson(marker, { workspace, releaseId: release.releaseId });
}

function probeTmux(workspace, env) {
  const socket = `lab-ready-${randomUUID()}`;
  run('tmux', ['-L', socket, '-f', '/dev/null', 'new-session', '-d', '-s', 'readiness'], workspace, env);
  try {
    run('tmux', ['-L', socket, 'has-session', '-t', 'readiness'], workspace, env);
  } finally {
    run('tmux', ['-L', socket, 'kill-server'], workspace, env);
  }
}

function probeTools(workspace, runtime, env) {
  const tools = {
    copilot: run(join(runtime, 'tools/node_modules/.bin/copilot'), ['--no-auto-update', '--version'], workspace, env).trim(),
    gh: run('gh', ['--version'], workspace, env).split('\n')[0],
    ghAw: run(join(runtime, 'gh-aw/gh-aw'), ['version'], workspace, env).trim(),
    pnpm: run('pnpm', ['--version'], workspace, env).trim(),
    jq: run('jq', ['--version'], workspace, env).trim(),
    dotnetSdks: run('dotnet', ['--list-sdks'], workspace, env).trim().split('\n'),
  };
  if (!tools.dotnetSdks.some((sdk) => sdk.startsWith('8.')) || !tools.dotnetSdks.some((sdk) => sdk.startsWith('9.'))) {
    throw new Error('Both prepared .NET SDKs are required');
  }
  run(process.execPath, [join(workspace, 'node_modules/vitest/vitest.mjs'), '--version'], workspace, env);
  run(process.execPath, ['-e', [
    'const {createRequire}=require("node:module");',
    'const r=createRequire(process.cwd()+"/node/package.json");',
    'const db=new (r("better-sqlite3"))(":memory:");',
    'if(db.prepare("SELECT 42 AS value").get().value!==42) throw Error("SQLite execution failed"); db.close();',
  ].join('')], workspace, env);
  return tools;
}

export async function checkReadiness(context, runtime, env) {
  const { workspace, release } = context;
  const tools = probeTools(workspace, runtime, env);
  probeTmux(workspace, env);
  const python = run('python', ['-c', [
    'import json,pandas as pd,pyarrow;',
    'df=pd.read_parquet("labs/fixtures/lab12/sales.parquet");',
    'assert list(df.columns)==["order_id","region","amount_usd","ts"]; assert len(df)==5;',
    'print(json.dumps({"rows":len(df),"pandas":pd.__version__,"pyarrow":pyarrow.__version__}))',
  ].join('')], workspace, env);
  const browser = run(process.execPath, [join(runtime, 'core/verify/browser.mjs'), workspace], workspace, env);
  const [mcp, lsp] = await Promise.all([probeMcp(workspace, runtime, env), probeLsp(workspace, runtime, env)]);
  return {
    event: 'core.ready', releaseId: release.releaseId, workspace, tools,
    python: JSON.parse(python), browser: JSON.parse(browser), mcp, lsp,
    notExercised: release.capabilities.excluded,
  };
}
