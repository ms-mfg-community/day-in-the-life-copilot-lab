import type { LanguageServer, LocalServer } from './types.mjs';
export function coreEnvironment(workspace: string, runtime: string, inherited?: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
export function mcpConfiguration(workspace: string, runtime: string): {
  mcpServers: {
    filesystem: LocalServer;
    memory: LocalServer & { env: Record<string, string> };
    'sequential-thinking': LocalServer;
  };
};
export function lspConfiguration(runtime: string): { lspServers: { typescript: LanguageServer; csharp: LanguageServer } };
