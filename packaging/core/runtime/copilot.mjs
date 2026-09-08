import { existsSync, lstatSync, mkdirSync, realpathSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { lspConfiguration, mcpConfiguration } from './profile.mjs';
import { assertPlainPath, readJson, writeJson } from './io.mjs';

const PROJECT_MCP = ['.mcp.json', '.github/mcp.json', '.copilot/mcp-config.json'];

export function prepareUserTools(context, runtime, env) {
  const home = env.HOME;
  if (!home) throw new Error('A writable per-user HOME is required; no shared credential directory is supported');
  const copilotHome = join(home, '.copilot-lab-core', context.state.workspaceId);
  mkdirSync(copilotHome, { recursive: true, mode: 0o700 });
  const lsp = assertPlainPath(copilotHome, 'lsp-config.json');
  if (!existsSync(lsp)) writeJson(lsp, lspConfiguration(runtime));
  const dataHome = env.XDG_DATA_HOME || join(home, '.local/share');
  const parent = assertPlainPath(dataHome, 'gh/extensions');
  const extension = join(parent, 'gh-aw');
  if (existsSync(extension) && lstatSync(extension).isSymbolicLink()
      && realpathSync(extension) !== realpathSync(join(runtime, 'gh-aw'))) {
    throw new Error('Existing gh-aw registration points outside the prepared runtime; it was not changed');
  }
  if (!existsSync(extension)) {
    mkdirSync(parent, { recursive: true, mode: 0o700 });
    symlinkSync(join(runtime, 'gh-aw'), extension, 'dir');
  }
  return { ...env, COPILOT_HOME: copilotHome };
}

export function copilotArguments(context, runtime, env, args) {
  if ((env.GITHUB_TOKEN || env.GH_TOKEN) && !env.COPILOT_GITHUB_TOKEN && env.LAB_COPILOT_USE_GITHUB_TOKEN !== '1') {
    throw new Error('Copilot identity is ambiguous: an inherited GitHub token overrides OAuth. Choose credentials explicitly; no credentials were changed.');
  }
  if (args.some((arg) => /^--(additional-mcp-config|enable-mcp-server|config-dir|plugin-dir|enable-all-github-mcp-tools|add-github-mcp)/.test(arg))) {
    throw new Error('That option changes the prepared capability profile; use a separately approved connected lane');
  }
  const files = [...PROJECT_MCP.map((path) => join(context.workspace, path)), join(env.COPILOT_HOME, 'mcp-config.json')];
  const disabled = files.filter(existsSync).flatMap((file) => Object.keys(readJson(file).mcpServers ?? {}));
  const local = mcpConfiguration(context.workspace, runtime).mcpServers;
  const config = { mcpServers: Object.fromEntries(Object.entries(local).map(([name, server]) => [`lab-${name}`, server])) };
  if (disabled.some((name) => name.startsWith('lab-'))) throw new Error('Existing lab-* MCP names conflict with the prepared profile');
  return [
    '--no-auto-update', '--disable-builtin-mcps',
    ...[...new Set(disabled)].flatMap((name) => ['--disable-mcp-server', name]),
    '--additional-mcp-config', JSON.stringify(config), ...args,
  ];
}
