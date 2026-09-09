import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { coreEnvironment, mcpConfiguration, lspConfiguration } from '../../packaging/core/runtime/profile.mjs';
import { copilotArguments, effectiveLspServers, prepareUserTools } from '../../packaging/core/runtime/copilot.mjs';
import { put } from './fixtures.js';

const workspace = resolve('a renamed checkout');
const runtime = resolve('runtime');
const temporary: string[] = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('prepared core configuration boundaries', () => {
  it('restricts package resolution and chooses persistent local development data', () => {
    const env = coreEnvironment(workspace, runtime, { GITHUB_TOKEN: 'user-scoped', GH_TOKEN: 'also-scoped' });
    expect(env.npm_config_offline).toBe('true');
    expect(env.PIP_NO_INDEX).toBe('1');
    expect(env.RestoreLockedMode).toBe('true');
    expect(env.NuGetAudit).toBe('false');
    expect(env.DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE).toBe('true');
    expect(env.ASPNETCORE_ENVIRONMENT).toBe('Development');
    expect(env.CONTOSO_SQLITE_PATH).toContain('.lab-state');
    expect(env.GITHUB_TOKEN).toBe('user-scoped');
    expect(env.GH_TOKEN).toBe('also-scoped');
  });

  it('uses only real local MCP executables with checkout-scoped state and fixture access', () => {
    const config = mcpConfiguration(workspace, runtime);
    expect(Object.keys(config.mcpServers).sort()).toEqual(['filesystem', 'memory', 'sequential-thinking']);
    for (const server of Object.values(config.mcpServers)) {
      expect(server.command).not.toMatch(/npx|npm|pnpm/);
      expect(server).not.toHaveProperty('url');
    }
    expect(config.mcpServers.filesystem.args).toContain(resolve(workspace, 'labs/fixtures'));
    expect(config.mcpServers.memory.env.MEMORY_FILE_PATH).toContain('.lab-state');
  });

  it('wires both language servers to their own source roots', () => {
    const config = lspConfiguration(runtime);
    expect(config.lspServers.typescript.rootUri).toBe('node');
    expect(config.lspServers.csharp.rootUri).toBe('dotnet');
    expect(config.lspServers.typescript.args).toContain('--stdio');
  });

  it('leaves the working default unchanged and stages no unpublished image reference', () => {
    const current = JSON.parse(readFileSync('.devcontainer/devcontainer.json', 'utf8'));
    expect(current.image).toBe('mcr.microsoft.com/devcontainers/dotnet:8.0');
    expect(current.postCreateCommand).toBe('bash .devcontainer/post-create.sh');
    const staged = JSON.parse(readFileSync('packaging/core/devcontainer.template.json', 'utf8'));
    expect(staged).not.toHaveProperty('image');
    expect(staged).not.toHaveProperty('features');
    expect(staged).not.toHaveProperty('build');
    expect(JSON.stringify(staged)).not.toMatch(/post-create\.sh|npm install|pnpm install|dotnet restore/);
  });

  it('preserves the managed gh-aw registration and edited LSP settings on resume', () => {
    const root = mkdtempSync(join(tmpdir(), 'lab-profile-test-'));
    temporary.push(root);
    const home = join(root, 'home');
    const installed = join(root, 'runtime');
    const extension = join(home, '.local/share/gh/extensions/gh-aw');
    mkdirSync(join(installed, 'gh-aw'), { recursive: true });
    mkdirSync(join(home, '.local/share/gh/extensions'), { recursive: true });
    symlinkSync(join(installed, 'gh-aw'), extension, process.platform === 'win32' ? 'junction' : 'dir');
    const context = { workspace: root, state: { workspaceId: 'test-workspace' } };
    const lsp = join(home, '.copilot-lab-core/test-workspace/lsp-config.json');
    put(lsp, '{"attendee":"keep"}');
    prepareUserTools(context, installed, { HOME: home });
    expect(readFileSync(lsp, 'utf8')).toBe('{"attendee":"keep"}');
  });

  it('does not let an inherited token silently pick the Copilot identity', () => {
    const env = { GH_TOKEN: 'scoped', COPILOT_HOME: resolve('unused') };
    expect(() => copilotArguments({ workspace }, runtime, env, [])).toThrow(/identity is ambiguous/);
    expect(env.GH_TOKEN).toBe('scoped');
  });

  it('disables all existing MCP profiles and supplies only namespaced bundled servers', () => {
    const root = mkdtempSync(join(tmpdir(), 'lab-mcp-profile-test-'));
    temporary.push(root);
    put(join(root, '.mcp.json'), JSON.stringify({ mcpServers: { 'unexpected-remote': { url: 'https://example.invalid' } } }));
    const args = copilotArguments({ workspace: root }, runtime, { COPILOT_HOME: join(root, 'home') }, []);
    expect(args).toContain('--no-auto-update');
    expect(args).toContain('--disable-builtin-mcps');
    expect(args).toContain('unexpected-remote');
    const config = JSON.parse(args[args.indexOf('--additional-mcp-config') + 1]);
    expect(Object.keys(config.mcpServers).every((name) => name.startsWith('lab-'))).toBe(true);
  });
});

describe('effective attendee language-server configuration', () => {
  const bundled = lspConfiguration(runtime).lspServers;
  const saved = (servers: unknown) => {
    const copilotHome = mkdtempSync(join(tmpdir(), 'lab-effective-lsp-test-'));
    temporary.push(copilotHome);
    const path = join(copilotHome, 'lsp-config.json');
    const content = JSON.stringify({ lspServers: servers }, null, 2);
    put(path, content);
    return { env: { COPILOT_HOME: copilotHome }, path, content };
  };

  it('reads the preserved configuration the CLI consumes, not freshly built defaults', () => {
    const attendee = { ...bundled.typescript, command: '/attendee/typescript-language-server' };
    const { env } = saved({ typescript: attendee, csharp: bundled.csharp });
    const servers = effectiveLspServers(env);
    expect(servers.typescript.command).toBe('/attendee/typescript-language-server');
    expect(servers.typescript.command).not.toBe(bundled.typescript.command);
    expect(servers.csharp.command).toBe(bundled.csharp.command);
  });

  it('rejects an unusable saved definition instead of certifying a bundled default, and preserves it', () => {
    const { env, path, content } = saved({ typescript: { ...bundled.typescript, command: '' }, csharp: bundled.csharp });
    expect(() => effectiveLspServers(env)).toThrow(/typescript/);
    expect(() => effectiveLspServers(env)).toThrow(/not (changed|overwritten)/i);
    expect(readFileSync(path, 'utf8')).toBe(content);
  });

  it('rejects saved configuration that dropped a required language server', () => {
    const { env } = saved({ typescript: bundled.typescript });
    expect(() => effectiveLspServers(env)).toThrow(/csharp/);
  });

  it('rejects a saved definition with malformed arguments or source root', () => {
    expect(() => effectiveLspServers(saved({
      typescript: { ...bundled.typescript, args: '--stdio' }, csharp: bundled.csharp,
    }).env)).toThrow(/typescript/);
    expect(() => effectiveLspServers(saved({
      typescript: bundled.typescript, csharp: { ...bundled.csharp, rootUri: '' },
    }).env)).toThrow(/csharp/);
  });

  it('reports a missing or unreadable user configuration rather than falling back to the image', () => {
    const copilotHome = mkdtempSync(join(tmpdir(), 'lab-absent-lsp-test-'));
    temporary.push(copilotHome);
    expect(() => effectiveLspServers({ COPILOT_HOME: copilotHome })).toThrow(/lsp-config\.json/);
    expect(() => effectiveLspServers({})).toThrow(/COPILOT_HOME/);
    put(join(copilotHome, 'lsp-config.json'), '{ not json');
    expect(() => effectiveLspServers({ COPILOT_HOME: copilotHome })).toThrow(/lsp-config\.json/);
  });
});
