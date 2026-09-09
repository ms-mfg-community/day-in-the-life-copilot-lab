import type { LanguageServer } from './types.mjs';
export function prepareUserTools(context: { workspace: string; state: { workspaceId: string } }, runtime: string, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
export function effectiveLspServers(env: NodeJS.ProcessEnv): { typescript: LanguageServer; csharp: LanguageServer };
export function copilotArguments(context: { workspace: string }, runtime: string, env: NodeJS.ProcessEnv, args: string[]): string[];
