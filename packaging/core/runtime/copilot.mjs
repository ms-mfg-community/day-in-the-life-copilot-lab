import { existsSync, lstatSync, mkdirSync, realpathSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { lspConfiguration, mcpConfiguration } from './profile.mjs';
import { assertPlainPath, readJson, writeJson } from './io.mjs';

const PROJECT_MCP = ['.mcp.json', '.github/mcp.json', '.copilot/mcp-config.json'];
const REQUIRED_LANGUAGE_SERVERS = ['typescript', 'csharp'];
const LAUNCH_FORMS = ['command', 'bash', 'powershell'];

const stringRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  && Object.values(value).every((entry) => typeof entry === 'string');

export function launchForm(server) {
  return LAUNCH_FORMS.find((form) => typeof server?.[form] === 'string' && server[form].length > 0);
}

// Mirrors the schema the consumed CLI applies to lsp-config.json, plus the one
// requirement the prepared probe adds: a source root to request symbols from.
function languageServerProblem(server) {
  if (!server || typeof server !== 'object' || Array.isArray(server)) return 'the entry must be an object';
  if (!launchForm(server)) return "at least one of 'command', 'bash', or 'powershell' must be specified and non-empty";
  if (!stringRecord(server.fileExtensions)) return 'fileExtensions is required and must map file extensions to language identifiers';
  if (server.args !== undefined && (!Array.isArray(server.args) || server.args.some((argument) => typeof argument !== 'string'))) {
    return 'args must be an array of strings';
  }
  if (typeof server.rootUri !== 'string' || !server.rootUri) {
    return 'rootUri must name a source root, because prepared readiness probes the server against it';
  }
  return undefined;
}

export function effectiveLspServers(env) {
  if (!env.COPILOT_HOME) throw new Error('COPILOT_HOME is required to read the language-server configuration the CLI actually consumes');
  const path = join(env.COPILOT_HOME, 'lsp-config.json');
  if (!existsSync(path)) {
    throw new Error(`No user language-server configuration at ${path}; run lab-core init once. No bundled default was substituted.`);
  }
  const servers = readJson(path).lspServers;
  return Object.fromEntries(REQUIRED_LANGUAGE_SERVERS.map((language) => {
    const server = servers?.[language];
    const problem = languageServerProblem(server);
    if (problem) {
      throw new Error(`The saved ${language} language server in ${path} is unusable: ${problem}. It was not changed.`);
    }
    return [language, { ...server, args: server.args ?? [] }];
  }));
}

// The preserved MCP state the prepared Copilot launcher must be able to read.
export function disabledMcpNames(context, env) {
  const files = [...PROJECT_MCP.map((path) => join(context.workspace, path)), join(env.COPILOT_HOME, 'mcp-config.json')];
  const names = [...new Set(files.filter(existsSync).flatMap((file) => Object.keys(readJson(file).mcpServers ?? {})))];
  if (names.some((name) => name.startsWith('lab-'))) throw new Error('Existing lab-* MCP names conflict with the prepared profile');
  return names;
}

export function prepareUserTools(context, runtime, env) {
  assertPlainPath(context.workspace, 'labs/fixtures');
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
  const disabled = disabledMcpNames(context, env);
  const local = mcpConfiguration(context.workspace, runtime).mcpServers;
  const config = { mcpServers: Object.fromEntries(Object.entries(local).map(([name, server]) => [`lab-${name}`, server])) };
  return [
    '--no-auto-update', '--disable-builtin-mcps',
    ...disabled.flatMap((name) => ['--disable-mcp-server', name]),
    '--additional-mcp-config', JSON.stringify(config), ...args,
  ];
}

