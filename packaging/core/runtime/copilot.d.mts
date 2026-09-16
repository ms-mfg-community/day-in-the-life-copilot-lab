import type { LanguageServer } from './types.mjs';
export function prepareUserTools(context: { workspace: string; state: { workspaceId: string } }, runtime: string, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
export function launchForm(server: unknown): 'command' | 'bash' | 'powershell' | undefined;
export function effectiveLspServers(env: NodeJS.ProcessEnv): { typescript: LanguageServer; csharp: LanguageServer };
export function disabledMcpNames(context: { workspace: string }, env: NodeJS.ProcessEnv): string[];
export function copilotArguments(context: { workspace: string }, runtime: string, env: NodeJS.ProcessEnv, args: string[]): string[];
