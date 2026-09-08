import { join } from 'node:path';

export function coreEnvironment(workspace, runtime, inherited = process.env) {
  const state = join(workspace, '.lab-state');
  return {
    ...inherited,
    LAB_WORKSPACE: workspace, LAB_RUNTIME: runtime,
    PATH: [join(runtime, 'bin'), join(runtime, 'tools/node_modules/.bin'), join(runtime, 'dotnet-tools'), join(runtime, 'python/bin'), inherited.PATH]
      .filter(Boolean).join(process.platform === 'win32' ? ';' : ':'),
    NUGET_PACKAGES: join(state, 'nuget'),
    RestoreSources: join(runtime, 'nuget-feed'),
    RestoreConfigFile: join(runtime, 'NuGet.Config'),
    RestoreLockedMode: 'true', NuGetAudit: 'false',
    DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_NOLOGO: '1',
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1',
    DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE: 'true',
    npm_config_offline: 'true', npm_config_audit: 'false', npm_config_update_notifier: 'false',
    COREPACK_ENABLE_NETWORK: '0',
    GH_NO_UPDATE_NOTIFIER: '1', GH_NO_EXTENSION_UPDATE_NOTIFIER: '1',
    PIP_NO_INDEX: '1', PIP_DISABLE_PIP_VERSION_CHECK: '1',
    PLAYWRIGHT_BROWSERS_PATH: join(runtime, 'browsers'),
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1', PLAYWRIGHT_SKIP_BROWSER_GC: '1',
    ASPNETCORE_ENVIRONMENT: 'Development',
    ASPNETCORE_URLS: 'http://127.0.0.1:52380',
    ConnectionStrings__DefaultConnection: `Data Source=${join(state, 'contoso-dotnet.db')}`,
    CONTOSO_SQLITE_PATH: join(state, 'contoso-node.db'),
  };
}

export function mcpConfiguration(workspace, runtime) {
  const command = (name) => join(runtime, 'tools/node_modules/.bin', name);
  return {
    mcpServers: {
      filesystem: {
        type: 'local', command: command('mcp-server-filesystem'),
        args: [join(workspace, 'labs/fixtures')], tools: ['*'],
      },
      memory: {
        type: 'local', command: command('mcp-server-memory'), args: [], tools: ['*'],
        env: { MEMORY_FILE_PATH: join(workspace, '.lab-state/memory.jsonl') },
      },
      'sequential-thinking': {
        type: 'local', command: command('mcp-server-sequential-thinking'), args: [], tools: ['*'],
        env: { DISABLE_THOUGHT_LOGGING: 'true' },
      },
    },
  };
}

export function lspConfiguration(runtime) {
  return {
    lspServers: {
      typescript: {
        command: join(runtime, 'tools/node_modules/.bin/typescript-language-server'),
        args: ['--stdio'], rootUri: 'node',
        fileExtensions: { '.ts': 'typescript', '.tsx': 'typescriptreact', '.js': 'javascript' },
      },
      csharp: {
        command: join(runtime, 'dotnet-tools/csharp-ls'),
        args: [], rootUri: 'dotnet', fileExtensions: { '.cs': 'csharp' },
      },
    },
  };
}
